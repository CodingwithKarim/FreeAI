import './App.css'
import { ChatArea } from './components/chat/ChatArea'
import { AppLayout } from './components/layout/AppLayout'
import { ModelControl } from './components/model/ModelControl'
import { SessionControl } from './components/session/SessionControl'
import { ChatProvider, useChat } from './context/ChatContext'

function App() {
  return (
    <>
      <ChatProvider>
        <AppLayout>
          <AppContent/>
        </AppLayout>
      </ChatProvider>
    </>
  )
}

function AppContent(){
  const {selectedModel, selectedSession, isLoadingModel} = useChat()

  const activeSession = Boolean(selectedSession)

  return (
    <>
      <SessionControl/>
      {activeSession && <ModelControl/>}
      {activeSession && selectedModel && !isLoadingModel && <ChatArea/>}
    </>
  )
}

export default App