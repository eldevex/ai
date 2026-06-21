// ============================================
// SETTINGS CSS MODULE
// ============================================

const settingsStyles = document.createElement("style");
settingsStyles.textContent = `
  .settings-container {
    padding: 16px;
    max-width: 600px;
    margin: 0 auto;
  }
  
  .settings-section {
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    margin-bottom: 12px;
    overflow: hidden;
    border: 1px solid var(--border-color);
  }
  
  .settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    cursor: pointer;
    transition: background 0.2s ease;
    user-select: none;
  }
  
  .settings-header:hover {
    background: var(--bg-hover);
  }
  
  .settings-header-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
  }
  
  .settings-header-left span {
    font-size: 16px;
    font-weight: 500;
    color: var(--text-primary);
  }
  
  .settings-icon {
    color: var(--accent-color);
    font-size: 20px;
  }
  
  .settings-chevron {
    color: var(--text-secondary);
    transition: transform 0.3s ease;
  }
  
  .settings-content {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease, padding 0.3s ease;
    padding: 0 16px;
  }
  
  .settings-content.expanded {
    max-height: 1000px;
    padding: 0 16px 16px;
  }
  
  .settings-field {
    margin-bottom: 16px;
  }
  
  .settings-label {
    display: block;
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .settings-textarea {
    width: 100%;
    min-height: 120px;
    padding: 12px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--bg-input);
    color: var(--text-primary);
    font-size: 14px;
    resize: vertical;
    font-family: inherit;
    line-height: 1.5;
  }
  
  .settings-textarea:disabled {
    background: var(--bg-tertiary);
  }
  
  .settings-toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding: 12px;
    background: var(--bg-tertiary);
    border-radius: var(--radius-md);
  }
  
  .settings-preview-box {
    padding: 12px;
    background: var(--bg-tertiary);
    border-radius: var(--radius-md);
    font-size: 13px;
    border-left: 3px solid var(--border-color);
    margin-bottom: 16px;
    max-height: 100px;
    overflow-y: auto;
    line-height: 1.5;
  }
  
  .settings-preview-box.active {
    border-left-color: var(--accent-color);
    color: var(--text-secondary);
  }
  
  .settings-preview-box.disabled {
    border-left-color: var(--text-muted);
  }
  
  .settings-preview-box.warning {
    border-left-color: var(--danger-color);
  }
  
  .settings-preview-placeholder {
    font-style: italic;
    opacity: 0.6;
  }
  
  .settings-buttons-row {
    display: flex;
    gap: 10px;
  }
  
  .settings-save-btn {
    margin-top: 8px;
  }
  
  .settings-action-btn {
    margin-bottom: 10px;
    width: 100%;
  }
  
  .settings-action-btn.secondary {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
  }
  
  .settings-hint {
    margin-top: 16px;
    font-size: 12px;
    color: var(--text-muted);
    line-height: 1.4;
  }
  
  .settings-hint strong {
    font-weight: 600;
  }
  
  .about-content {
    text-align: center;
    padding: 20px;
  }
  
  .about-content h3 {
    color: var(--text-primary);
    margin-bottom: 8px;
  }
  
  .about-content p {
    color: var(--text-secondary);
    margin-bottom: 4px;
  }
  
  ons-input input {
    color: var(--text-primary) !important;
  }
  
  .export-divider {
    height: 1px;
    background: var(--border-color);
    margin: 16px 0;
  }
  
  .export-subsection {
    margin-bottom: 20px;
  }
  
  .export-subsection:last-child {
    margin-bottom: 0;
  }
`;
document.head.appendChild(settingsStyles);
