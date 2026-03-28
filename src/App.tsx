import { AgentBuilder } from './components/AgentBuilder'
import { NotificationProvider } from './context/NotificationProvider'
import { useAgentBuilderLogic } from './hooks/useAgentBuilderLogic'

function AgentBuilderShell() {
  const logic = useAgentBuilderLogic()
  return <AgentBuilder {...logic} />
}

function App() {
  return (
    <NotificationProvider>
      <div className="ab-app">
        <AgentBuilderShell />
      </div>
    </NotificationProvider>
  )
}

export default App
