import { useContext } from "react";
import { SettingsContext } from "../../SettingsContext";

export function FeatureSettings() {
  const { settings, updateSettings } = useContext(SettingsContext);

  return (
    <div className="settings-category">
      <h3 className="settings-category-title">Feature Settings</h3>
      <p className="settings-category-description">
        Configure AI features and behavior.
      </p>

      <div className="settings-section">
        <h4 className="settings-subsection-title">Extended Thinking</h4>

        <div className="settings-group">
          <label className="settings-label">Extended Thinking Mode</label>
          <p className="settings-description">
            Enable extended thinking for deeper reasoning before responses
          </p>
          <label className="settings-checkbox-label">
            <input
              type="checkbox"
              className="settings-checkbox"
              checked={settings.extendedThinking.enabled}
              onChange={(e) =>
                updateSettings({
                  extendedThinking: {
                    ...settings.extendedThinking,
                    enabled: e.target.checked,
                  },
                })
              }
            />
            <span>Enable Extended Thinking</span>
          </label>
        </div>

        <div className="settings-group">
          <label htmlFor="thinking-budget-input" className="settings-label">
            Thinking Budget
          </label>
          <p className="settings-description">
            Maximum tokens for thinking (1024-10000). Higher values allow deeper
            reasoning but cost more.
          </p>
          <div className="settings-number-input">
            <input
              id="thinking-budget-input"
              type="number"
              className="settings-input"
              min="1024"
              max="10000"
              step="256"
              value={settings.extendedThinking.budget}
              disabled={!settings.extendedThinking.enabled}
              onChange={(e) =>
                updateSettings({
                  extendedThinking: {
                    ...settings.extendedThinking,
                    budget: parseInt(e.target.value) || 2048,
                  },
                })
              }
            />
            <span className="settings-input-suffix">tokens</span>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h4 className="settings-subsection-title">Auto-Apply Changes</h4>

        <div className="settings-group">
          <label className="settings-label">Automatic Code Application</label>
          <p className="settings-description">
            Automatically apply code changes without manual confirmation
          </p>
          <label className="settings-checkbox-label">
            <input
              type="checkbox"
              className="settings-checkbox"
              checked={settings.autoApplyChanges}
              onChange={(e) =>
                updateSettings({ autoApplyChanges: e.target.checked })
              }
            />
            <span>Auto-apply code changes</span>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h4 className="settings-subsection-title">Auto-Iteration</h4>

        <div className="settings-group">
          <label className="settings-label">Automatic Error Fixing</label>
          <p className="settings-description">
            Automatically detect and fix console errors after code changes
          </p>
          <label className="settings-checkbox-label">
            <input
              type="checkbox"
              className="settings-checkbox"
              checked={settings.autoIteration.enabled}
              onChange={(e) =>
                updateSettings({
                  autoIteration: {
                    ...settings.autoIteration,
                    enabled: e.target.checked,
                  },
                })
              }
            />
            <span>Enable auto-iteration</span>
          </label>
        </div>

        <div className="settings-group">
          <label htmlFor="max-iterations-input" className="settings-label">
            Max Iterations
          </label>
          <p className="settings-description">
            Maximum number of automatic fix attempts per error (1-10)
          </p>
          <input
            id="max-iterations-input"
            type="number"
            className="settings-input"
            min="1"
            max="10"
            value={settings.autoIteration.maxIterations}
            disabled={!settings.autoIteration.enabled}
            onChange={(e) =>
              updateSettings({
                autoIteration: {
                  ...settings.autoIteration,
                  maxIterations: parseInt(e.target.value) || 3,
                },
              })
            }
          />
        </div>

        <div className="settings-group">
          <label htmlFor="max-requests-input" className="settings-label">
            Max Total Requests
          </label>
          <p className="settings-description">
            Maximum total requests per conversation to prevent runaway
            iterations (5-50)
          </p>
          <input
            id="max-requests-input"
            type="number"
            className="settings-input"
            min="5"
            max="50"
            value={settings.autoIteration.maxTotalRequests}
            disabled={!settings.autoIteration.enabled}
            onChange={(e) =>
              updateSettings({
                autoIteration: {
                  ...settings.autoIteration,
                  maxTotalRequests: parseInt(e.target.value) || 20,
                },
              })
            }
          />
        </div>

        <div className="settings-group">
          <label htmlFor="wait-time-input" className="settings-label">
            Error Detection Wait Time
          </label>
          <p className="settings-description">
            Time to wait after code changes before checking for errors. Increase
            for complex animations or slow operations (2000-10000ms).
          </p>
          <div className="settings-number-input">
            <input
              id="wait-time-input"
              type="number"
              className="settings-input"
              min="2000"
              max="10000"
              step="500"
              value={settings.autoIteration.waitTimeMs}
              disabled={!settings.autoIteration.enabled}
              onChange={(e) =>
                updateSettings({
                  autoIteration: {
                    ...settings.autoIteration,
                    waitTimeMs: parseInt(e.target.value) || 5000,
                  },
                })
              }
            />
            <span className="settings-input-suffix">ms</span>
          </div>
        </div>

        <div className="settings-group">
          <label className="settings-label">Oscillation Detection</label>
          <p className="settings-description">
            Detect when errors cycle between states and stop iteration
          </p>
          <label className="settings-checkbox-label">
            <input
              type="checkbox"
              className="settings-checkbox"
              checked={settings.autoIteration.detectOscillation}
              disabled={!settings.autoIteration.enabled}
              onChange={(e) =>
                updateSettings({
                  autoIteration: {
                    ...settings.autoIteration,
                    detectOscillation: e.target.checked,
                  },
                })
              }
            />
            <span>Enable oscillation detection</span>
          </label>
        </div>

        <div className="settings-group">
          <label className="settings-label">Stack Traces</label>
          <p className="settings-description">
            Include full stack traces in error messages sent to AI
          </p>
          <label className="settings-checkbox-label">
            <input
              type="checkbox"
              className="settings-checkbox"
              checked={settings.autoIteration.includeStackTraces}
              disabled={!settings.autoIteration.enabled}
              onChange={(e) =>
                updateSettings({
                  autoIteration: {
                    ...settings.autoIteration,
                    includeStackTraces: e.target.checked,
                  },
                })
              }
            />
            <span>Include stack traces</span>
          </label>
        </div>
      </div>
    </div>
  );
}
