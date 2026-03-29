import { EditorDemo } from './EditorDemo';
import { AgentBridgeClient } from '../bridge/AgentBridgeClient';

function App() {
  return (
    <>
      <AgentBridgeClient />
      <EditorDemo />
    </>
  );
}

export default App;
