import React from 'react';
import { AlertCircle } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('[flyers.fan]', error, info); }
  componentDidUpdate(prev) { if (prev.resetKey !== this.props.resetKey) this.setState({ error: null }); }
  render() {
    if (this.state.error) {
      return (
        <div className="p-6">
          <div className="border border-red-500/30 bg-red-500/[0.05] rounded-md p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={16} className="text-red-400" />
              <span className="text-[13px] font-medium text-red-300">Render error</span>
            </div>
            <div className="text-[12px] font-mono text-white/70 whitespace-pre-wrap break-words">
              {String(this.state.error?.message || this.state.error)}
            </div>
            <div className="text-[11px] font-mono text-white/40 mt-3">
              The data source likely returned an unexpected shape. Try refreshing.
              If it persists, the NHL API endpoint may have changed.
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
