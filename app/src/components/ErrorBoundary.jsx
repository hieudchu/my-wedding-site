import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('React error boundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '"Cormorant Garamond", serif',
          color: '#6B5E5B',
          textAlign: 'center',
          padding: 40,
        }}>
          <div>
            <h1 style={{ fontSize: 48, fontWeight: 400, margin: '0 0 12px' }}>Hiếu &amp; Minh</h1>
            <p style={{ fontStyle: 'italic', color: '#A89996' }}>
              Trang web đang được cập nhật. Vui lòng quay lại sau.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
