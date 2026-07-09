import type { LightingConfig } from './BoardData';

type Props = {
  config: LightingConfig;
};

export function SceneLighting({ config }: Props) {
  return (
    <>
      <ambientLight intensity={config.ambientIntensity} />
      <directionalLight
        position={[config.keyPosition.x, config.keyPosition.y, config.keyPosition.z]}
        intensity={config.keyIntensity}
      />
      <directionalLight
        position={[config.fillPosition.x, config.fillPosition.y, config.fillPosition.z]}
        intensity={config.fillIntensity}
      />
    </>
  );
}
