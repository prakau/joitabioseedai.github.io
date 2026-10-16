import { Component, type ReactNode } from "react";
import { Home, RefreshCw } from "lucide-react";

export class ErrorBoundary extends Component<{ children: ReactNode; language?: string; onHome?: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    const hindi = this.props.language === "hi" || document.documentElement.lang === "hi";
    return <section className="module-recovery" role="alert">
      <h2>{hindi ? "यह उपकरण अभी नहीं खुल सका" : "This farm tool could not open"}</h2>
      <p>{hindi ? "आपके सहेजे हुए रिकॉर्ड सुरक्षित हैं। कनेक्शन जांचें और फिर खोलें।" : "Your saved records are still on this device. Check your connection, then reload this tool."}</p>
      <div className="actions">
        <button className="primary-link" onClick={() => window.location.reload()}><RefreshCw size={18} />{hindi ? "फिर खोलें" : "Reload tool"}</button>
        {this.props.onHome && <button className="secondary-link" onClick={this.props.onHome}><Home size={18} />{hindi ? "डैशबोर्ड खोलें" : "Back to dashboard"}</button>}
      </div>
      <a href="mailto:contact@joitabioseedai.com">{hindi ? "JOITA टीम से संपर्क करें" : "Contact the JOITA team"}</a>
    </section>;
  }
}
