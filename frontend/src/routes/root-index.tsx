import { useAuth } from "../auth-context"
import Home from "./home"
import Landing from "./landing"

function RootIndex() {
  const { user } = useAuth()
  return user ? <Home /> : <Landing />
}

export default RootIndex
