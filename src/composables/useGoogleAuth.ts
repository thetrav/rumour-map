import { ref, type Ref } from 'vue'
import { GOOGLE_CONFIG } from '@/config/google'
import type { AuthState } from '@/types/rumour'

// In-memory token storage (not persisted)
let accessToken: string | null = null
let tokenClient: any = null

// Shared authentication state across all instances
const authState: Ref<AuthState> = ref({
  isAuthenticated: false,
  isInitializing: true,
  error: null,
  user: null
})

// Track if we had a previous session (before refresh)
const hadPreviousSession = ref(false)

/**
 * Composable for Google OAuth2 authentication
 * Manages authentication state and token lifecycle
 */
export function useGoogleAuth() {

  /**
   * Initialize Google Identity Services token client
   */
  const initializeAuth = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // If tokenClient is already initialized, no need to re-initialize
      // This prevents duplicate initialization when multiple GoogleAuthButton instances mount
      if (tokenClient) {
        resolve()
        return
      }

      authState.value.isInitializing = true
      authState.value.error = null

      // Check for scope changes and clear stale auth state
      const currentScope = GOOGLE_CONFIG.scope
      const storedScope = sessionStorage.getItem('auth_scope')
      
      if (storedScope && storedScope !== currentScope) {
        // Scope changed, clear auth state to force re-consent
        sessionStorage.removeItem('auth_state')
        console.log('OAuth scope changed, re-authentication required')
      }
      
      // Store current scope for future checks
      sessionStorage.setItem('auth_scope', currentScope)

      // Wait for google object to be available
      const checkGoogle = setInterval(() => {
        if (window.google?.accounts) {
          clearInterval(checkGoogle)
          
          try {
            tokenClient = window.google.accounts.oauth2.initTokenClient({
              client_id: GOOGLE_CONFIG.clientId,
              scope: GOOGLE_CONFIG.scope,
              callback: (tokenResponse: any) => {
                if (tokenResponse.error) {
                  authState.value.error = tokenResponse.error_description || tokenResponse.error
                  authState.value.isAuthenticated = false
                  reject(new Error(tokenResponse.error))
                  return
                }
                
                // Store token in memory
                accessToken = tokenResponse.access_token
                authState.value.isAuthenticated = true
                authState.value.error = null
                
                // Store non-sensitive auth flag in sessionStorage
                sessionStorage.setItem('auth_state', 'authenticated')
                
                resolve()
              },
            })
            
            authState.value.isInitializing = false
            
            // Check if we have a previous session
            if (sessionStorage.getItem('auth_state') === 'authenticated') {
              hadPreviousSession.value = true
              // Note: Do not automatically trigger sign-in here to avoid duplicate popups
              // The user will need to sign in again if their session has expired
            }
            
            resolve()
          } catch (error) {
            authState.value.isInitializing = false
            authState.value.error = 'Failed to initialize authentication'
            reject(error)
          }
        }
      }, 100)

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkGoogle)
        if (authState.value.isInitializing) {
          authState.value.isInitializing = false
          authState.value.error = 'Google authentication library failed to load'
          reject(new Error('Timeout waiting for Google library'))
        }
      }, 10000)
    })
  }

  /**
   * Request access token from user (triggers OAuth flow)
   */
  const signIn = () => {
    if (!tokenClient) {
      authState.value.error = 'Authentication not initialized'
      return
    }

    try {
      tokenClient.requestAccessToken()
    } catch (error: any) {
      authState.value.error = error.message || 'Sign-in failed'
      console.error('Sign-in error:', error)
    }
  }

  /**
   * Sign out and clear token
   */
  const signOut = () => {
    accessToken = null
    authState.value.isAuthenticated = false
    authState.value.user = null
    authState.value.error = null
    sessionStorage.removeItem('auth_state')

    // Revoke token if google API is available
    if (window.google?.accounts?.oauth2 && accessToken) {
      try {
        window.google.accounts.oauth2.revoke(accessToken)
      } catch (error) {
        console.warn('Failed to revoke token:', error)
      }
    }
  }

  /**
   * Get current access token (in-memory only)
   */
  const getAccessToken = (): string | null => {
    return accessToken
  }

  /**
   * Check if token exists and is likely valid
   */
  const hasValidToken = (): boolean => {
    return accessToken !== null && authState.value.isAuthenticated
  }

  return {
    authState,
    hadPreviousSession,
    initializeAuth,
    signIn,
    signOut,
    getAccessToken,
    hasValidToken
  }
}
