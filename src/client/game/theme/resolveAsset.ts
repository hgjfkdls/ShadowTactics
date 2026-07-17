import { assetRegistry } from '../../assets/assetMap';

export function getAbilityIconUrl(themeId: string, abilityId: string): string | undefined {
  return (
    assetRegistry[`themes/${themeId}/ability-icons/${abilityId}.png`] ??
    assetRegistry[`themes/default/ability-icons/${abilityId}.png`]
  );
}

export function getUnitBustUrl(themeId: string, cls: string): string | undefined {
  return (
    assetRegistry[`themes/${themeId}/unit-busts/${cls}.png`] ??
    assetRegistry[`themes/default/unit-busts/${cls}.png`]
  );
}
