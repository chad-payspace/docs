const TokenGenerator = () => {
    const generateToken = () => {
      const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkRlbW8gVXNlciIsImlhdCI6MTUxNjIzOTAyMn0.${Math.random().toString(36).substring(2)}`;
      const tokenInput = document.getElementById('token-input') as HTMLInputElement;
      const copyButton = document.getElementById('copy-button');
      const tokenDisplay = document.getElementById('token-display');
      
      if (tokenInput && copyButton && tokenDisplay) {
        tokenInput.value = token;
        copyButton.style.display = 'inline-block';
        tokenDisplay.style.display = 'block';
      }
    };
  
    const copyToClipboard = () => {
      const tokenInput = document.getElementById('token-input') as HTMLInputElement;
      if (tokenInput) {
        tokenInput.select();
        document.execCommand('copy');
        
        const copyButton = document.getElementById('copy-button');
        if (copyButton) {
          copyButton.textContent = 'Copied!';
          setTimeout(() => {
            copyButton.textContent = 'Copy Token';
          }, 2000);
        }
      }
    };
  
    return `
      <div class="token-generator">
        <style>
          .token-generator {
            padding: 1.5rem;
            border: 1px solid #e5e7eb;
            border-radius: 0.5rem;
            background-color: #f9fafb;
          }
          .token-generator.dark {
            background-color: #1f2937;
            border-color: #374151;
          }
          .button-group {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1rem;
          }
          .button {
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          }
          .button.primary {
            background-color: #16A34A;
            color: white;
            border: none;
          }
          .button.primary:hover {
            background-color: #15803D;
          }
          .button.secondary {
            background-color: white;
            color: #374151;
            border: 1px solid #d1d5db;
          }
          .button.secondary:hover {
            background-color: #f3f4f6;
          }
          .token-input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #d1d5db;
            border-radius: 0.375rem;
            font-family: monospace;
            font-size: 0.875rem;
            background-color: white;
          }
          .token-display {
            display: none;
            margin-top: 1rem;
          }
          .token-help {
            margin-top: 0.5rem;
            font-size: 0.875rem;
            color: #6b7280;
          }
          .dark .token-help {
            color: #9ca3af;
          }
        </style>
        <div class="button-group">
          <button class="button primary" onclick="(${generateToken})()">
            Generate Demo Token
          </button>
          <button id="copy-button" class="button secondary" onclick="(${copyToClipboard})()" style="display: none;">
            Copy Token
          </button>
        </div>
        <div id="token-display" style="display: none;">
          <input id="token-input" class="token-input" type="text" readonly />
          <p class="token-help">
            Use this token in your Authorization header: <code>Authorization: Bearer <span id="token-text"></span></code>
          </p>
        </div>
      </div>
    `;
  };
  
  export default TokenGenerator; 
  