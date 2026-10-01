import {
  loadConfig,
  AppConfigurationManager,
  ConfigurationStateTransitionError,
  ConfigurationAuthorizationError,
  DEFAULT_ALLOWED_ASSETS,
} from './appConfiguration';

describe('src/appConfiguration.ts', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.SSRF_ALLOW_PRIVATE_HOSTS;
    AppConfigurationManager.resetInstance();
  });

  afterAll(() => {
    process.env = originalEnv;
    AppConfigurationManager.resetInstance();
  });

  describe('loadConfig - Deterministic inputs and boundary cases', () => {
    it('returns default configuration when environment is empty', () => {
      const config = loadConfig({});
      expect(config.port).toBe(3001);
      expect(config.gracefulDegradationEnabled).toBe(true);
      expect(config.upstreamContractsUrl).toBe('https://example.invalid/contracts');
      expect(config.upstreamTimeoutMs).toBe(1200);
      expect(config.chaosMode).toBe('off');
      expect(config.chaosTargets).toEqual([]);
      expect(config.chaosProbability).toBe(0);
      expect(config.circuitBreaker.failureThreshold).toBe(5);
      expect(config.circuitBreaker.successThreshold).toBe(1);
      expect(config.circuitBreaker.timeoutMs).toBe(30000);
      expect(config.webhookRetry.maxAttempts).toBe(5);
      expect(config.webhookRetry.initialDelayMs).toBe(1000);
      expect(config.webhookRetry.maxDelayMs).toBe(30000);
      expect(config.allowedAssets).toEqual(DEFAULT_ALLOWED_ASSETS);
      expect(config.milestonesEnabled).toBe(true);
    });

    it('clamps boundary-case inputs deterministically', () => {
      const env = {
        PORT: '999999', // Exceeds 65535
        UPSTREAM_TIMEOUT_MS: '50000', // Exceeds MAX_TIMEOUT_MS (10000)
        CHAOS_PROBABILITY: '1.5', // Exceeds 1
        IDEMPOTENCY_TTL_MS: '-500', // Subzero
      };
      const config = loadConfig(env);
      expect(config.port).toBe(65535);
      expect(config.upstreamTimeoutMs).toBe(10000);
      expect(config.chaosProbability).toBe(1);
      expect(config.idempotencyTtlMs).toBe(0);
    });

    it('handles negative or lower boundary-case inputs correctly', () => {
      const env = {
        PORT: '-10',
        UPSTREAM_TIMEOUT_MS: '10', // Less than MIN_TIMEOUT_MS (100)
        CHAOS_PROBABILITY: '-0.5',
      };
      const config = loadConfig(env);
      expect(config.port).toBe(1);
      expect(config.upstreamTimeoutMs).toBe(100);
      expect(config.chaosProbability).toBe(0);
    });

    it('falls back to defaults on invalid non-numeric inputs', () => {
      const env = {
        PORT: 'not-a-number',
        UPSTREAM_TIMEOUT_MS: 'abc',
        CHAOS_PROBABILITY: 'xyz',
      };
      const config = loadConfig(env);
      expect(config.port).toBe(3001);
      expect(config.upstreamTimeoutMs).toBe(1200);
      expect(config.chaosProbability).toBe(0);
    });

    it('normalizes and deduplicates duplicate allowed assets', () => {
      const env = {
        ALLOWED_ASSETS: 'USDC, xlm, usdc, XLM, btc, BTC, ETH, usdc',
      };
      const config = loadConfig(env);
      expect(config.allowedAssets).toEqual(['USDC', 'XLM', 'BTC', 'ETH']);
    });

    it('falls back to default allowed assets when provided string is empty or invalid', () => {
      const env = {
        ALLOWED_ASSETS: '   , ,,,   ',
      };
      const config = loadConfig(env);
      expect(config.allowedAssets).toEqual(DEFAULT_ALLOWED_ASSETS);
    });

    it('normalizes and deduplicates chaos targets', () => {
      const env = {
        CHAOS_TARGETS: 'contracts, AUTH, contracts, auth, payments',
      };
      const config = loadConfig(env);
      expect(config.chaosTargets).toEqual(['contracts', 'auth', 'payments']);
    });

    it('parses boolean environment variables correctly', () => {
      expect(loadConfig({ GRACEFUL_DEGRADATION_ENABLED: 'false' }).gracefulDegradationEnabled).toBe(false);
      expect(loadConfig({ GRACEFUL_DEGRADATION_ENABLED: '0' }).gracefulDegradationEnabled).toBe(false);
      expect(loadConfig({ GRACEFUL_DEGRADATION_ENABLED: 'true' }).gracefulDegradationEnabled).toBe(true);
      expect(loadConfig({ GRACEFUL_DEGRADATION_ENABLED: '1' }).gracefulDegradationEnabled).toBe(true);
      expect(loadConfig({ MILESTONES_ENABLED: 'false' }).milestonesEnabled).toBe(false);
    });
  });

  describe('Cross-field invariant protection', () => {
    it('enforces webhookRetry maxDelayMs >= initialDelayMs invariant', () => {
      const env = {
        WEBHOOK_RETRY_INITIAL_DELAY_MS: '10000',
        WEBHOOK_RETRY_MAX_DELAY_MS: '500', // Invalid: maxDelayMs < initialDelayMs
      };
      const config = loadConfig(env);
      expect(config.webhookRetry.initialDelayMs).toBe(10000);
      expect(config.webhookRetry.maxDelayMs).toBe(10000); // Enforced invariant
    });

    it('enforces circuit breaker thresholds invariants', () => {
      const env = {
        CB_FAILURE_THRESHOLD: '0',
        CB_SUCCESS_THRESHOLD: '-5',
        CB_TIMEOUT_MS: '10',
      };
      const config = loadConfig(env);
      expect(config.circuitBreaker.failureThreshold).toBe(1);
      expect(config.circuitBreaker.successThreshold).toBe(1);
      expect(config.circuitBreaker.timeoutMs).toBe(1000);
    });
  });

  describe('SSRF Protection invariants', () => {
    it('blocks private IPv4 and localhost by default', () => {
      expect(() => loadConfig({ UPSTREAM_CONTRACTS_URL: 'http://localhost:8080' })).toThrow(
        /SSRF protection blocked access to internal resource/
      );
      expect(() => loadConfig({ UPSTREAM_CONTRACTS_URL: 'http://127.0.0.1/contracts' })).toThrow(
        /SSRF protection blocked access to internal resource/
      );
      expect(() => loadConfig({ UPSTREAM_CONTRACTS_URL: 'http://10.0.0.1/contracts' })).toThrow(
        /SSRF protection blocked access to internal resource/
      );
      expect(() => loadConfig({ UPSTREAM_CONTRACTS_URL: 'http://192.168.1.1/contracts' })).toThrow(
        /SSRF protection blocked access to internal resource/
      );
    });

    it('blocks non-http/https protocols', () => {
      expect(() => loadConfig({ UPSTREAM_CONTRACTS_URL: 'ftp://api.example.com/contracts' })).toThrow(
        /SSRF protection blocked access to internal resource/
      );
      expect(() => loadConfig({ UPSTREAM_CONTRACTS_URL: 'javascript:alert(1)' })).toThrow(
        /SSRF protection blocked access to internal resource/
      );
    });

    it('allows valid public URLs', () => {
      const config = loadConfig({ UPSTREAM_CONTRACTS_URL: 'https://api.talenttrust.io/contracts' });
      expect(config.upstreamContractsUrl).toBe('https://api.talenttrust.io/contracts');
    });
  });

  describe('deepFreeze - Immutability invariant', () => {
    it('deeply freezes configuration so nested properties cannot be mutated', () => {
      const config = loadConfig({});
      expect(Object.isFrozen(config)).toBe(true);
      expect(Object.isFrozen(config.circuitBreaker)).toBe(true);
      expect(Object.isFrozen(config.webhookRetry)).toBe(true);
      expect(Object.isFrozen(config.allowedAssets)).toBe(true);
      expect(Object.isFrozen(config.chaosTargets)).toBe(true);

      // Mutating in strict mode throws TypeError
      expect(() => {
        // @ts-expect-error test runtime mutation protection
        config.port = 8080;
      }).toThrow(TypeError);

      expect(() => {
        // @ts-expect-error test runtime mutation protection
        config.allowedAssets.push('HACK');
      }).toThrow(TypeError);

      expect(() => {
        // @ts-expect-error test runtime mutation protection
        config.circuitBreaker.failureThreshold = 999;
      }).toThrow(TypeError);
    });
  });

  describe('AppConfigurationManager - State transitions and authorization invariants', () => {
    it('initializes from UNINITIALIZED to ACTIVE through INITIALIZING', () => {
      const manager = AppConfigurationManager.getInstance();
      expect(manager.getState()).toBe('UNINITIALIZED');

      const config = manager.initialize({}, { role: 'system' });
      expect(manager.getState()).toBe('ACTIVE');
      expect(config.port).toBe(3001);
      expect(manager.getConfig().port).toBe(3001);
    });

    it('rejects initialization by unauthorized actors', () => {
      const manager = AppConfigurationManager.getInstance();
      expect(() => manager.initialize({}, { role: 'anonymous' })).toThrow(
        ConfigurationAuthorizationError
      );
      expect(manager.getState()).toBe('UNINITIALIZED');
    });

    it('rejects double initialization', () => {
      const manager = AppConfigurationManager.getInstance();
      manager.initialize({}, { role: 'system' });

      expect(() => manager.initialize({}, { role: 'system' })).toThrow(
        ConfigurationStateTransitionError
      );
    });

    it('exercises allowed state transitions: ACTIVE -> DEGRADED -> ACTIVE -> SHUTTING_DOWN -> TERMINATED', () => {
      const manager = AppConfigurationManager.getInstance();
      manager.initialize({}, { role: 'system' });

      // Allowed: ACTIVE -> DEGRADED
      manager.transitionState('DEGRADED', { role: 'admin' }, 'Upstream service latency high');
      expect(manager.getState()).toBe('DEGRADED');

      // Allowed: DEGRADED -> ACTIVE
      manager.transitionState('ACTIVE', { role: 'admin' }, 'Upstream recovered');
      expect(manager.getState()).toBe('ACTIVE');

      // Allowed: ACTIVE -> SHUTTING_DOWN
      manager.transitionState('SHUTTING_DOWN', { role: 'system' }, 'SIGTERM received');
      expect(manager.getState()).toBe('SHUTTING_DOWN');

      // Allowed: SHUTTING_DOWN -> TERMINATED
      manager.transitionState('TERMINATED', { role: 'system' });
      expect(manager.getState()).toBe('TERMINATED');
    });

    it('rejects forbidden state transitions', () => {
      const manager = AppConfigurationManager.getInstance();
      manager.initialize({}, { role: 'system' });

      // Forbidden: cannot jump directly from ACTIVE to TERMINATED
      expect(() => manager.transitionState('TERMINATED', { role: 'system' })).toThrow(
        ConfigurationStateTransitionError
      );

      // Transition to SHUTTING_DOWN then TERMINATED
      manager.transitionState('SHUTTING_DOWN', { role: 'system' });
      manager.transitionState('TERMINATED', { role: 'system' });

      // Forbidden: cannot transition out of TERMINATED
      expect(() => manager.transitionState('ACTIVE', { role: 'admin' })).toThrow(
        ConfigurationStateTransitionError
      );
    });

    it('handles repeated idempotent transitions without error', () => {
      const manager = AppConfigurationManager.getInstance();
      manager.initialize({}, { role: 'system' });

      // Re-transitioning to ACTIVE is an idempotent no-op
      const state = manager.transitionState('ACTIVE', { role: 'admin' });
      expect(state).toBe('ACTIVE');
    });

    it('reloads configuration atomically with rollback on invalid configuration', () => {
      const manager = AppConfigurationManager.getInstance();
      manager.initialize({ PORT: '3000' }, { role: 'admin' });
      expect(manager.getConfig().port).toBe(3000);

      // Valid reload
      manager.reloadConfig({ PORT: '4000' }, { role: 'admin' });
      expect(manager.getConfig().port).toBe(4000);

      // Invalid reload (SSRF failure) rolls back to prior valid config
      expect(() =>
        manager.reloadConfig({ UPSTREAM_CONTRACTS_URL: 'http://127.0.0.1' }, { role: 'admin' })
      ).toThrow(/SSRF protection/);

      // Prior config preserved
      expect(manager.getConfig().port).toBe(4000);
      expect(manager.getState()).toBe('ACTIVE');
    });

    it('rejects config access in UNINITIALIZED or TERMINATED states', () => {
      const manager = AppConfigurationManager.getInstance();
      expect(() => manager.getConfig()).toThrow(/Cannot access configuration in 'UNINITIALIZED'/);

      manager.initialize({}, { role: 'system' });
      manager.transitionState('SHUTTING_DOWN', { role: 'system' });
      manager.transitionState('TERMINATED', { role: 'system' });

      expect(() => manager.getConfig()).toThrow(/Cannot access configuration in 'TERMINATED'/);
    });
  });
});
