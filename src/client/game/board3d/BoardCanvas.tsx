import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

const CAMERA_DISTANCE = Math.sqrt(300 * 300 + 300 * 300);
const FOV = 45;
const FRUSTUM_SIZE = 200;
const VISIBLE_HEIGHT = 2 * CAMERA_DISTANCE * Math.tan(FOV / 2 * Math.PI / 180);
const ORTHO_ZOOM = (2 * FRUSTUM_SIZE) / VISIBLE_HEIGHT;

type Props = {
  children: React.ReactNode;
  cameraMode: 'perspective' | 'orthographic';
};

export function BoardCanvas({ children, cameraMode }: Props) {
  return (
    <Canvas
      key={cameraMode}
      {...(cameraMode === 'orthographic'
        ? { orthographic: true, camera: { position: [0, 300, 300], zoom: ORTHO_ZOOM, near: 1, far: 2000 } }
        : { camera: { position: [0, 300, 300], fov: FOV, near: 1, far: 2000 } }
      )}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[100, 200, 100]} intensity={0.8} />
      <directionalLight position={[-100, 100, -100]} intensity={0.3} />
      <OrbitControls
        enablePan
        enableZoom
        enableRotate={false}
        mouseButtons={{ LEFT: 2, MIDDLE: 1, RIGHT: 2 }}
        {...(cameraMode === 'orthographic'
          ? { minZoom: ORTHO_ZOOM * 0.3, maxZoom: ORTHO_ZOOM * 10 }
          : { minDistance: 100, maxDistance: 800 }
        )}
        target={[0, 0, 0]}
        screenSpacePanning={false}
      />
      {children}
    </Canvas>
  );
}
