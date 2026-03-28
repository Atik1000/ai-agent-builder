export interface AgentProfile {
  id: string
  name: string
  description: string
}

export interface Skill {
  id: string
  name: string
  category: string
  description: string
}

export interface Layer {
  id: string
  name: string
  type: string
  description: string
}

export interface AgentData {
  agentProfiles: AgentProfile[]
  skills: Skill[]
  layers: Layer[]
}

export interface SavedAgent {
  id: string
  name: string
  profileId: string
  skillIds: string[]
  layerIds: string[]
  provider?: string
}
