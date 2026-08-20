const fs = require('fs');

let content = fs.readFileSync('C:\\xampp\\htdocs\\Growvidya-fullstack\\journey.md', 'utf-8');

const updateLog = `
### [2026-08-11] Redux Toolkit State Management Integration
- Installed \`@reduxjs/toolkit\` and \`react-redux\`.
- Created production-ready, clean Redux Store architecture in \`src/store/\`:
  - \`store/store.js\` (Central store configuration)
  - \`store/slices/authSlice.js\` (Auth state thunks: \`loginAdmin\`, \`checkAdminAuth\`, \`logoutAdmin\`)
- Migrated components (\`AdminLogin.jsx\`, \`Sidebar.jsx\`, \`ProtectedRoute.jsx\`, \`AdminDashboard.jsx\`) to Redux hooks (\`useSelector\`, \`useDispatch\`).
- Wrapped \`App.jsx\` with Redux \`<Provider store={store}>\`.
- Verified build with Vite (\`npm run build\` - 0 errors).
`;

content += updateLog;

fs.writeFileSync('C:\\xampp\\htdocs\\Growvidya-fullstack\\journey.md', content);
fs.writeFileSync('C:\\Users\\ADMIN\\.gemini\\antigravity-cli\\brain\\421f9439-5c3b-42ae-84c7-b9d7c005d1a2\\journey.md', content);

console.log('journey.md updated.');
