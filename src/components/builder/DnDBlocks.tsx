import { useDraggable, useDroppable } from '@dnd-kit/core'
import type { ReactNode } from 'react'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { LAYERS_DROP_ZONE, SKILLS_DROP_ZONE } from '../../lib/dndZones'
import type { Layer, Skill } from '../../types'

export function PaletteSkillCard({ skill }: { skill: Skill }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-skill-${skill.id}`,
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`ab-dnd-palette-card${isDragging ? ' ab-dnd-palette-card--dragging' : ''}`}
      title={skill.description}
    >
      <span className="ab-dnd-palette-card__title">{skill.name}</span>
      <span className="ab-dnd-palette-card__meta">{skill.category}</span>
    </div>
  )
}

export function PaletteLayerCard({ layer }: { layer: Layer }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-layer-${layer.id}`,
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`ab-dnd-palette-card${isDragging ? ' ab-dnd-palette-card--dragging' : ''}`}
      title={layer.description}
    >
      <span className="ab-dnd-palette-card__title">{layer.name}</span>
      <span className="ab-dnd-palette-card__meta">{layer.type}</span>
    </div>
  )
}

function SortableRow({
  id,
  title,
  subtitle,
  onRemove,
}: {
  id: string
  title: string
  subtitle: string
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`ab-dnd-sort-row${isDragging ? ' ab-dnd-sort-row--dragging' : ''}`}
    >
      <button
        type="button"
        className="ab-dnd-sort-handle"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <div className="ab-dnd-sort-body">
        <span className="ab-dnd-sort-title">{title}</span>
        <span className="ab-dnd-sort-meta">{subtitle}</span>
      </div>
      <button type="button" className="ab-dnd-sort-remove" onClick={onRemove}>
        Remove
      </button>
    </div>
  )
}

function DnDDropShell({
  dropId,
  label,
  emptyHint,
  isEmpty,
  children,
}: {
  dropId: string
  label: string
  emptyHint: string
  isEmpty: boolean
  children: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dropId })

  return (
    <div className="ab-config-block">
      <span className="ab-label">{label}</span>
      <div
        ref={setNodeRef}
        className={`ab-dnd-drop${isOver ? ' ab-dnd-drop--over' : ''}${isEmpty ? ' ab-dnd-drop--empty' : ''}`}
      >
        {children}
        {isEmpty ? <p className="ab-dnd-drop__hint">{emptyHint}</p> : null}
      </div>
    </div>
  )
}

export function SkillsBuildZone({
  skillIds,
  skillsById,
  onRemove,
}: {
  skillIds: string[]
  skillsById: (id: string) => Skill | undefined
  onRemove: (id: string) => void
}) {
  const isEmpty = skillIds.length === 0
  return (
    <DnDDropShell
      dropId={SKILLS_DROP_ZONE}
      label="Your skills (drag here or reorder)"
      emptyHint="Drop skill cards here or use quick-add below. Order is saved with the agent."
      isEmpty={isEmpty}
    >
      <SortableContext items={skillIds} strategy={verticalListSortingStrategy}>
        <div className="ab-dnd-sort-list">
          {skillIds.map((id) => {
            const s = skillsById(id)
            return (
              <SortableRow
                key={id}
                id={id}
                title={s?.name ?? id}
                subtitle={s?.category ?? ''}
                onRemove={() => onRemove(id)}
              />
            )
          })}
        </div>
      </SortableContext>
    </DnDDropShell>
  )
}

export function LayersBuildZone({
  layerIds,
  layersById,
  onRemove,
}: {
  layerIds: string[]
  layersById: (id: string) => Layer | undefined
  onRemove: (id: string) => void
}) {
  const isEmpty = layerIds.length === 0
  return (
    <DnDDropShell
      dropId={LAYERS_DROP_ZONE}
      label="Personality layers (drag here or reorder)"
      emptyHint="Drop layer cards here. Stack order matters for how you think about the persona."
      isEmpty={isEmpty}
    >
      <SortableContext items={layerIds} strategy={verticalListSortingStrategy}>
        <div className="ab-dnd-sort-list">
          {layerIds.map((id) => {
            const l = layersById(id)
            return (
              <SortableRow
                key={id}
                id={id}
                title={l?.name ?? id}
                subtitle={l?.type ?? ''}
                onRemove={() => onRemove(id)}
              />
            )
          })}
        </div>
      </SortableContext>
    </DnDDropShell>
  )
}
