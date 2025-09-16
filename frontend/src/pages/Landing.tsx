import React from 'react';
import { useNavigate } from 'react-router-dom';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f7fafc' }}>
      {/* Hero Section */}
      <div style={{ padding: '80px 20px', textAlign: 'center', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          backgroundColor: '#3182ce',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '20px',
          display: 'inline-block',
          fontSize: '18px',
          marginBottom: '32px'
        }}>
          🚀 Star Citizen Guild Coordination
        </div>

        <h1 style={{
          fontSize: '48px',
          fontWeight: 'bold',
          background: 'linear-gradient(90deg, #3182ce, #805ad5)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '24px'
        }}>
          SphereConnect
        </h1>

        <p style={{
          fontSize: '20px',
          color: '#4a5568',
          maxWidth: '600px',
          margin: '0 auto 40px',
          lineHeight: '1.6'
        }}>
          AI-assisted coordination platform for Star Citizen guilds. Manage objectives, tasks, and resources
          with military precision and voice integration.
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              backgroundColor: '#3182ce',
              color: 'white',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            🚀 Get Started
          </button>
          <button
            onClick={() => window.open('https://github.com/your-repo/sphereconnect', '_blank')}
            style={{
              backgroundColor: 'transparent',
              color: '#3182ce',
              padding: '12px 24px',
              border: '2px solid #3182ce',
              borderRadius: '8px',
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            📖 View on GitHub
          </button>
        </div>
      </div>

      {/* Features Section */}
      <div style={{ padding: '80px 20px', backgroundColor: 'white' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '16px' }}>
              Powerful Features
            </h2>
            <p style={{ fontSize: '18px', color: '#4a5568', maxWidth: '600px', margin: '0 auto' }}>
              Everything you need to coordinate your Star Citizen guild operations effectively.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '32px'
          }}>
            <div style={{
              padding: '24px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>
                AI-Assisted Coordination
              </h3>
              <p style={{ color: '#4a5568' }}>
                Leverage AI to optimize mission planning and resource allocation for your Star Citizen guild.
              </p>
            </div>

            <div style={{
              padding: '24px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>
                Multitenant Guild Management
              </h3>
              <p style={{ color: '#4a5568' }}>
                Secure, isolated environments for each guild with comprehensive user and role management.
              </p>
            </div>

            <div style={{
              padding: '24px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>
                Military-Grade Security
              </h3>
              <p style={{ color: '#4a5568' }}>
                JWT authentication, MFA, and role-based access control ensure your operations stay secure.
              </p>
            </div>

            <div style={{
              padding: '24px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎤</div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>
                Voice Integration
              </h3>
              <p style={{ color: '#4a5568' }}>
                Seamless integration with Wingman AI for voice-controlled guild operations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div style={{ padding: '80px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '16px' }}>
          Ready to Coordinate Like Never Before?
        </h2>
        <p style={{
          fontSize: '18px',
          color: '#4a5568',
          maxWidth: '600px',
          margin: '0 auto 40px'
        }}>
          Join the ranks of elite Star Citizen guilds using SphereConnect for mission success.
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              backgroundColor: '#3182ce',
              color: 'white',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '18px',
              cursor: 'pointer'
            }}
          >
            Start Your Mission
          </button>
          <button
            onClick={() => navigate('/docs')}
            style={{
              backgroundColor: 'transparent',
              color: '#3182ce',
              padding: '12px 24px',
              border: '2px solid #3182ce',
              borderRadius: '8px',
              fontSize: '18px',
              cursor: 'pointer'
            }}
          >
            Read Documentation
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ backgroundColor: '#1a202c', color: 'white', padding: '32px 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <p>&copy; 2025 SphereConnect. All rights reserved.</p>
            <div style={{ display: 'flex', gap: '24px' }}>
              <a href="/privacy" style={{ color: '#a0aec0', textDecoration: 'none' }}>Privacy</a>
              <a href="/terms" style={{ color: '#a0aec0', textDecoration: 'none' }}>Terms</a>
              <a href="/contact" style={{ color: '#a0aec0', textDecoration: 'none' }}>Contact</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;