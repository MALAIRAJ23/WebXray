import React, { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * WebXray - React ErrorBoundary
 * Isolates component runtime crashes so one broken module never breaks the entire dashboard.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[WebXray ErrorBoundary] Error in ${this.props.moduleName || 'component'}:`, error, errorInfo);
    this.setState({ errorInfo });
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const moduleName = this.props.moduleName || 'Module';
      return (
        <div className="p-4 rounded-[6px] bg-wl-surface border border-[#f85149]/40 text-wl-text font-sans space-y-3">
          <div className="flex items-center gap-2 text-[#f85149] font-medium text-[13px]">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{moduleName} encountered an error</span>
          </div>

          <p className="text-[12px] text-wl-muted leading-relaxed">
            An unexpected error occurred while rendering this view. Other audit modules continue to operate normally.
          </p>

          {this.state.error && (
            <div className="p-2.5 rounded-[4px] bg-wl-bg border border-wl-border font-mono text-[11px] text-[#f85149] overflow-x-auto">
              {this.state.error.message || String(this.state.error)}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={this.handleReset}
              className="py-1 px-3 rounded-[6px] bg-wl-surface hover:bg-wl-raised border border-wl-border text-[12px] font-sans text-wl-text flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload {moduleName}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
