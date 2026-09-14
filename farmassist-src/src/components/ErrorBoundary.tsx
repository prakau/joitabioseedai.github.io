import { Component, type ReactNode } from "react";
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main style={{ padding: 32, maxWidth: 720, margin: "auto" }}><h1>FarmAssist could not open this view</h1><p>Your stored records have not been deleted. Reload the app and try again.</p><button onClick={() => window.location.reload()}>Reload FarmAssist</button><p><a href="mailto:contact@joitabioseedai.com">Contact the JOITA team</a></p></main>;
  }
}
