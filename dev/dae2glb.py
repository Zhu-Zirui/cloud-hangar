# -*- coding: utf-8 -*-
"""
dev/dae2glb.py — FR24 源 dae → glTF2 GLB 转换(P13,复刻 P1 b738/b789 管线)
用法:python dev/dae2glb.py <zip路径> <dae文件名> <输出id>
在 zip 内解包到临时目录(pycollada 要求贴图与 dae 同目录),trimesh 读取场景导出 GLB。
材质:PBR(baseColorTexture,metallic 0/roughness 0.92,与 P1 口径一致)。
"""
import sys, os, zipfile, tempfile, shutil, json, struct

def main():
    zip_path, dae_name, out_id = sys.argv[1], sys.argv[2], sys.argv[3]
    import trimesh
    tmp = tempfile.mkdtemp(prefix='dae2glb_')
    try:
        with zipfile.ZipFile(zip_path) as z:
            for n in z.namelist():
                if n.startswith('__MACOSX') or n.endswith('/'):
                    continue
                z.extract(n, tmp)
        dae_path = os.path.join(tmp, dae_name)
        sc = trimesh.load(dae_path, force='scene', process=False)
        merged = sc.dump(concatenate=True)
        out_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'models', out_id)
        os.makedirs(out_dir, exist_ok=True)
        out_path = os.path.join(out_dir, out_id + '.glb')
        sc.export(out_path)
        # 三角形计数(GLB accessor)
        with open(out_path, 'rb') as f:
            magic, ver, ln = struct.unpack('<4sII', f.read(12))
            clen, _ = struct.unpack('<II', f.read(8))
            j = json.loads(f.read(clen))
        tri = sum(j['accessors'][p['indices']]['count'] // 3 for m in j.get('meshes', []) for p in m.get('primitives', []))
        print(f'OK {out_id}: {os.path.getsize(out_path):,} bytes, {tri:,} 三角形, ext={merged.extents.round(1)}')
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

if __name__ == '__main__':
    main()
