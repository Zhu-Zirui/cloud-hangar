# -*- coding: utf-8 -*-
"""
dev/ac2glb.py — AC3D(.ac)→glTF2 GLB 转换器(P13,FGMEMBERS 机型解锁)
格式规格沿用 P2 会话记录:AC3Db 文本格式;OBJECT(world|group|poly)层级 kids 变换累积;
refs 的 uv v 原点在左下 → glTF 翻转(1-v);SURF 0x20 双面;行向量约定 v' = v·M。
用法:python dev/ac2glb.py <ac路径> <纹理搜索目录>... <输出id>
缺失纹理的 poly 丢弃(P2 --drop-tex 先例,通常是座舱内部件)。
"""
import sys, os
import numpy as np
from PIL import Image
import trimesh
from trimesh.visual.material import PBRMaterial
from trimesh.visual.texture import TextureVisuals


def rot_matrix(vals):
    """AC3D rot 9 值 → 3x3(行向量约定 v' = v·R,列向量实现取转置;若实测镜像则改回不转置)"""
    a, b, c, d, e, f, g, h, i = [float(x) for x in vals]
    return np.array([[a, d, g], [b, e, h], [c, f, i]])


def parse_floats(tok):
    try:
        return [float(x) for x in tok]
    except ValueError:
        return None


def parse_ac(path):
    materials = []
    objs = []
    cur = None
    frames = []      # [{'matrix': 4x4 父帧, 'remaining': n}]
    current = np.eye(4)

    def new_frame_matrix():
        return frames[-1]['matrix'].copy() if frames else np.eye(4)

    def emit(obj):
        if obj and obj.get('verts') and obj.get('surfs') and obj.get('wmat') is not None:
            verts = np.array(obj['verts'], dtype=float)
            ones = np.ones((len(verts), 1))
            world = np.hstack([verts, ones]) @ obj['wmat'].T
            objs.append({'texture': obj.get('texture'),
                         'verts': world[:, :3],
                         'surfs': obj['surfs'], 'mat': obj.get('mat', 0)})

    with open(path, encoding='utf-8', errors='ignore') as f:
        header = f.readline().strip()
        assert header.startswith('AC3D'), header
        for line in f:
            line = line.strip()
            if not line:
                continue
            tok = line.split()
            key = tok[0]
            if key == 'MATERIAL':
                vals = {}
                i = 1
                while i < len(tok):
                    k = tok[i]
                    if k in ('rgb', 'amb', 'emis', 'spec'):
                        v = parse_floats(tok[i+1:i+4])
                        if v:
                            vals[k] = v
                        i += 4
                    elif k in ('shi', 'trans'):
                        v = parse_floats(tok[i+1:i+2])
                        if v:
                            vals[k] = v[0]
                        i += 2
                    else:
                        i += 1
                materials.append({'rgb': vals.get('rgb', [0.8]*3),
                                  'emis': vals.get('emis', [0.0]*3),
                                  'trans': vals.get('trans', 0.0)})
            elif key == 'OBJECT':
                emit(cur)
                # 弹出已耗尽的子帧;当前对象是最近一个还有配额的帧的子级
                while frames and frames[-1]['remaining'] <= 0:
                    frames.pop()
                if frames:
                    frames[-1]['remaining'] -= 1
                current = new_frame_matrix()
                cur = {'type': tok[1], 'verts': [], 'surfs': [], 'mat': 0, 'wmat': None}
            elif key == 'loc':
                v = parse_floats(tok[1:4])
                if v and cur is not None:
                    T = np.eye(4)
                    T[:3, 3] = v
                    current = current @ T
            elif key == 'rot':
                R = rot_matrix(tok[1:10])
                T = np.eye(4)
                T[:3, :3] = R.T
                current = current @ T
            elif key == 'texture':
                if cur is not None:
                    cur['texture'] = tok[1].strip('"')
            elif key == 'mat':
                if cur is None:
                    continue
                if cur.get('_surf_pending') is not None:
                    cur['_surf_pending']['mat'] = int(tok[1])
                else:
                    cur['mat'] = int(tok[1])
            elif key == 'numvert':
                if cur is not None:
                    cur['verts'] = []
                    cur['_vert_left'] = int(tok[1])
            elif cur is not None and cur.get('_vert_left'):
                v = parse_floats(tok)
                if v and len(v) >= 3 and cur.get('verts') is not None:
                    cur['verts'].append(v[:3])
                cur['_vert_left'] -= 1
            elif key == 'numsurf':
                if cur is not None:
                    cur['surfs'] = []
                    cur['_surf_pending'] = None
            elif key == 'SURF':
                if cur is not None:
                    cur['_surf_pending'] = {'flag': int(tok[1], 16), 'refs': []}
            elif key == 'refs':
                if cur is not None and cur.get('_surf_pending') is not None:
                    cur['_refs_left'] = int(tok[1])
            elif cur is not None and cur.get('_refs_left'):
                idx, u, v = int(tok[0]), float(tok[-2]), float(tok[-1])
                cur['_surf_pending']['refs'].append((idx, u, v))
                cur['_refs_left'] -= 1
                if cur['_refs_left'] == 0:
                    cur['surfs'].append(cur['_surf_pending'])
                    cur['_surf_pending'] = None
            elif key == 'kids':
                if cur is not None:
                    cur['wmat'] = current.copy()
                    emit(cur)
                    cur = None
                frames.append({'matrix': current.copy(), 'remaining': int(tok[1])})
        emit(cur)
    return materials, objs


def convert(ac_path, tex_dirs, out_id):
    materials, objs = parse_ac(ac_path)
    tex_cache = {}

    def load_tex(name):
        if name not in tex_cache:
            img = None
            for d in tex_dirs:
                p = os.path.join(d, name)
                if os.path.exists(p):
                    img = Image.open(p).convert('RGBA')
                    break
            tex_cache[name] = img
        return tex_cache[name]

    groups = {}
    dropped = 0
    for o in objs:
        img = load_tex(o['texture']) if o.get('texture') else None
        if o.get('texture') and img is None:
            dropped += 1
            continue
        mat = materials[o['mat']] if o['mat'] < len(materials) else {'rgb': [0.8]*3, 'trans': 0}
        key = (o.get('texture') or ('__mat%d__' % o['mat']), o['mat'])
        g = groups.setdefault(key, {'img': img, 'mat': mat, 'verts': [], 'faces': [], 'uvs': []})
        base = len(g['verts'])
        g['verts'].extend(o['verts'].tolist())
        g['uvs'].extend([(0.0, 0.0)] * len(o['verts']))
        if o.get('texture') and img is not None:
            for s in o['surfs']:
                for (vi, u, v) in s['refs']:
                    if 0 <= base + vi < len(g['uvs']):
                        g['uvs'][base + vi] = (u, 1.0 - v)
        for s in o['surfs']:
            refs = s['refs']
            for k in range(1, len(refs) - 1):
                g['faces'].append([base + refs[0][0], base + refs[k][0], base + refs[k+1][0]])

    scene = trimesh.Scene()
    for key, g in groups.items():
        if not g['faces'] or len(g['verts']) < 3:
            continue
        mesh = trimesh.Trimesh(vertices=np.array(g['verts']), faces=np.array(g['faces']), process=True)
        mat = g['mat']
        if g['img'] is not None:
            alpha_mode = 'OPAQUE'
            w, h = g['img'].size
            px = list(g['img'].getdata())[0::max(1, (w*h)//500)]
            if any(a[3] < 250 for a in px):
                alpha_mode = 'BLEND'
            pbr = PBRMaterial(name='mat', baseColorTexture=g['img'],
                              metallicFactor=0.05, roughnessFactor=0.9,
                              alphaMode=alpha_mode, doubleSided=True)
            mesh.visual = TextureVisuals(uv=np.array(g['uvs']), material=pbr)
        else:
            trans = float(mat.get('trans', 0.0))
            base_color = list(mat['rgb']) + [max(0.0, 1.0 - trans)]
            pbr = PBRMaterial(name='mat', baseColorFactor=base_color,
                              metallicFactor=0.05, roughnessFactor=0.7,
                              alphaMode='BLEND' if trans > 0.01 else 'OPAQUE',
                              doubleSided=True)
            mesh.visual = TextureVisuals(material=pbr)
        scene.add_geometry(mesh, node_name=str(key[0]))

    out_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'models', out_id)
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, out_id + '.glb')
    scene.export(out_path)
    tri = sum(len(m.faces) for m in scene.geometry.values())
    lo = np.array([1e9]*3)
    hi = -lo.copy()
    for g in scene.geometry.values():
        lo = np.minimum(lo, g.vertices.min(0))
        hi = np.maximum(hi, g.vertices.max(0))
    print(f'OK {out_id}: {os.path.getsize(out_path):,} bytes, {tri:,} 三角形, ext=[{hi[0]-lo[0]:.1f} {hi[1]-lo[1]:.1f} {hi[2]-lo[2]:.1f}], 丢弃(缺贴图)={dropped}, 组={len(scene.geometry)}')


if __name__ == '__main__':
    ac_path = sys.argv[1]
    out_id = sys.argv[-1]
    tex_dirs = sys.argv[2:-1]
    convert(ac_path, tex_dirs, out_id)
