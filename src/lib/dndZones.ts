export const SKILLS_DROP_ZONE = 'skills-drop-zone'
export const LAYERS_DROP_ZONE = 'layers-drop-zone'

export function isSkillDropTarget(overId: string, skillIds: string[]) {
  return overId === SKILLS_DROP_ZONE || skillIds.includes(overId)
}

export function isLayerDropTarget(overId: string, layerIds: string[]) {
  return overId === LAYERS_DROP_ZONE || layerIds.includes(overId)
}
