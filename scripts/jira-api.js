/**
 * Jira API Integration Script
 * Fetches issues from the Jira board using the Atlassian API
 */

const JIRA_BASE_URL = 'https://cursor-chess.atlassian.net';
const PROJECT_KEY = 'NS'; // From narrative-saga-jira-board.md

// Authentication: Use Basic Auth with email:api-token
// Get your email from your Atlassian account
// Get API token from: https://id.atlassian.com/manage-profile/security/api-tokens
// 
// Option 1 (Recommended): Set environment variables
//   export JIRA_EMAIL=your-email@example.com
//   export JIRA_API_TOKEN=your-token
//
// Option 2: Set directly below (less secure, but convenient for testing)
const JIRA_EMAIL = process.env.JIRA_EMAIL || 'hubbaheynow@gmail.com'; // Set your email here or via env var
const API_TOKEN = process.env.JIRA_API_TOKEN || 'ATATT3xFfGF0WduD84K1XitfFP-xlzusJdpyZEUN2VexbK1sKHzTmswHk1vDrH6CzyyfafwPVtnL4fFJvn-trJ1U1sJ23BNYBo7ceOBYJxDD7hxrL-gWbIPBiQbJAPg7GndAR8tbXPQMcTnItIMZ_g5d2CUa0dinvbVGkYz8u9OyM4PiYquuxxg=9F090ED3';

// Create Basic Auth header
function getAuthHeader() {
  const email = JIRA_EMAIL || process.env.JIRA_EMAIL;
  if (!email) {
    throw new Error(
      'JIRA_EMAIL is required.\n' +
      'Set it via environment variable: export JIRA_EMAIL=your-email@example.com\n' +
      'Or set it directly in the script (line 9)'
    );
  }
  const token = API_TOKEN || process.env.JIRA_API_TOKEN;
  const credentials = Buffer.from(`${email}:${token}`).toString('base64');
  return `Basic ${credentials}`;
}

// Completion details mapping from jira-update-guide.md
const COMPLETION_DETAILS = {
  'COT-203': {
    summary: 'Implemented move variety feature using Stockfish multipv',
    details: [
      'Added `aiVariety` state (1-5) to useAppStore',
      'Implemented `getTopMoves()` function in engine.ts with multipv support',
      'Updated `triggerAiMove()` to randomly select from top N moves',
      'Added variety control slider to AiControlPanel UI'
    ],
    files: [
      'src/stores/useAppStore.ts',
      'src/lib/engine.ts',
      'src/components/AiControlPanel.tsx'
    ]
  },
  'COT-204': {
    summary: 'Fixed "topMovesReject is not a function" error in timeout handler',
    details: [
      'Fixed timeout handler to save reject reference before calling stopCalculation()',
      'Properly handles cleanup when multipv calculation times out'
    ],
    files: [
      'src/lib/engine.ts (lines 281-297)'
    ]
  },
  'COT-205': {
    summary: 'Reduced depth by 2 when using multipv to improve performance',
    details: [
      'Implemented depth reduction strategy (depth - 2 for multipv)',
      'Maintains move quality while reducing calculation time by ~50-75%'
    ],
    files: [
      'src/stores/useAppStore.ts (line 400)'
    ]
  },
  'COT-504': {
    summary: 'Removed duplicate "LM Studio not connected" message from CoachChatPanel',
    details: [
      'Updated CoachChatPanel empty state to not duplicate connection status',
      'Single source of truth for connection status in CoachPanel header'
    ],
    files: [
      'src/components/CoachChatPanel.tsx (line 50)'
    ]
  },
  'COT-505': {
    summary: 'Enhanced connection status with better visual hierarchy',
    details: [
      'Added colored background containers (green/red)',
      'Changed "Refresh" button to "Check"',
      'Added prominent "Configure Connection" button',
      'Improved visual distinction between connected/disconnected states'
    ],
    files: [
      'src/components/CoachPanel.tsx (lines 107-141)',
      'src/App.tsx (lines 110-143)'
    ]
  },
  'COT-506': {
    summary: 'Enhanced tooltips for White/Black badges in openings list',
    details: [
      'Updated tooltip text to "You play as White/Black in this opening"',
      'Improved clarity of badge purpose'
    ],
    files: [
      'src/components/Sidebar.tsx (line 161)'
    ]
  },
  'COT-507': {
    summary: 'Verified single refresh button exists, no consolidation needed',
    details: [
      'Only one refresh button exists in visible UI (App.tsx inline CoachPanel)',
      'CoachPanel.tsx component exists but is not used, so no duplication'
    ],
    files: [
      'None (verified existing state)'
    ]
  }
};

/**
 * Make an authenticated request to Jira API
 */
async function jiraRequest(endpoint, options = {}, apiVersion = '3') {
  const url = `${JIRA_BASE_URL}/rest/api/${apiVersion}${endpoint}`;
  
  try {
    const authHeader = getAuthHeader();
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jira API error (${response.status}): ${errorText}`);
    }

    return response;
  } catch (error) {
    if (error.message.includes('JIRA_EMAIL')) {
      throw error;
    }
    throw new Error(`Request failed: ${error.message}`);
  }
}

/**
 * Get all projects (for debugging)
 */
async function getProjects() {
  const response = await jiraRequest('/project');
  return await response.json();
}

/**
 * Get available issue types for a project
 */
async function getIssueTypes(projectKey) {
  try {
    const project = await getProjectDetails(projectKey);
    const response = await jiraRequest(`/project/${project.id}/statuses`);
    const statuses = await response.json();
    
    // Get issue types from project metadata
    const metadataResponse = await jiraRequest(`/issue/createmeta?projectKeys=${projectKey}&expand=projects.issuetypes`);
    const metadata = await metadataResponse.json();
    
    if (metadata.projects && metadata.projects.length > 0) {
      return metadata.projects[0].issuetypes.map(it => ({
        id: it.id,
        name: it.name,
        description: it.description
      }));
    }
    return [];
  } catch (error) {
    console.warn(`Could not fetch issue types: ${error.message}`);
    // Fallback to common issue types
    return [
      { name: 'Task', id: '10001' },
      { name: 'Story', id: '10002' },
      { name: 'Bug', id: '10003' }
    ];
  }
}

/**
 * Get detailed project information
 */
async function getProjectDetails(projectKey) {
  const response = await jiraRequest(`/project/${projectKey}`);
  return await response.json();
}

/**
 * Check if SCRUM project is actually COT (Chess Opening Trainer)
 */
async function checkIfScrumIsCot() {
  try {
    const scrumProject = await getProjectDetails('SCRUM');
    const scrumIssues = await getProjectIssues('SCRUM', 10);
    
    // Check project name/description
    const projectName = (scrumProject.name || '').toLowerCase();
    const projectDescription = (scrumProject.description || '').toLowerCase();
    const nameMatches = projectName.includes('chess') || 
                       projectName.includes('opening') ||
                       projectDescription.includes('chess') ||
                       projectDescription.includes('opening');
    
    // Check issue content - COT issues would mention chess, openings, stockfish, etc.
    // NS issues would mention narrative, saga, PGN, turning points, etc.
    const issueSummaries = scrumIssues.map(i => (i.fields.summary || '').toLowerCase()).join(' ');
    const hasCotKeywords = issueSummaries.includes('chess') || 
                          issueSummaries.includes('opening') || 
                          issueSummaries.includes('stockfish') ||
                          issueSummaries.includes('ai opponent') ||
                          issueSummaries.includes('move variety');
    const hasNsKeywords = issueSummaries.includes('narrative') || 
                         issueSummaries.includes('saga') || 
                         issueSummaries.includes('pgn') ||
                         issueSummaries.includes('turning point') ||
                         issueSummaries.includes('recurring pattern');
    
    return {
      isCot: nameMatches || (hasCotKeywords && !hasNsKeywords),
      project: scrumProject,
      issues: scrumIssues,
      analysis: {
        nameMatches,
        hasCotKeywords,
        hasNsKeywords
      }
    };
  } catch (error) {
    return { isCot: false, error: error.message };
  }
}

/**
 * Rename project key and name
 */
async function renameProject(oldKey, newKey, newName, description = '') {
  try {
    const project = await getProjectDetails(oldKey);
    const updateData = {
      key: newKey,
      name: newName
    };
    if (description) {
      updateData.description = description;
    }
    
    const response = await jiraRequest(`/project/${oldKey}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
    return await response.json();
  } catch (error) {
    if (error.message.includes('403') || error.message.includes('permission')) {
      throw new Error(`Permission denied: Administer Jira global permission required to change project key. ${error.message}`);
    }
    throw error;
  }
}

/**
 * Create new project
 */
async function createProject(key, name, projectTypeKey = 'software', templateKey = 'com.atlassian.jira-core-project-templates:jira-core-simplified-process-control', description = '') {
  try {
    // Validate project key format
    if (!/^[A-Z]+$/.test(key)) {
      throw new Error(`Invalid project key format: ${key}. Must be uppercase letters only.`);
    }
    if (key.length < 2) {
      throw new Error(`Project key too short: ${key}. Must be at least 2 characters.`);
    }
    
    const projectData = {
      key: key,
      name: name,
      projectTypeKey: projectTypeKey,
      projectTemplateKey: templateKey
    };
    if (description) {
      projectData.description = description;
    }
    
    const response = await jiraRequest('/project', {
      method: 'POST',
      body: JSON.stringify(projectData)
    });
    return await response.json();
  } catch (error) {
    if (error.message.includes('403') || error.message.includes('permission')) {
      throw new Error(`Permission denied: Create Projects global permission required. ${error.message}`);
    }
    if (error.message.includes('400') && error.message.includes('key')) {
      throw new Error(`Project key conflict: ${key} may already exist or be invalid. ${error.message}`);
    }
    throw error;
  }
}

/**
 * Fetch all issues from the project using the new /search/jql endpoint
 */
async function getProjectIssues(projectKey = PROJECT_KEY, maxResults = 100) {
  const allIssues = [];
  let nextPageToken = null;
  
  do {
    const requestBody = {
      jql: `project = ${projectKey} ORDER BY created DESC`,
      maxResults: Math.min(maxResults - allIssues.length, 50), // Fetch in chunks of 50
      fields: ['summary', 'status', 'assignee', 'created', 'updated', 'issuetype', 'priority', 'labels', 'components', 'fixVersions']
    };
    
    if (nextPageToken) {
      requestBody.pageToken = nextPageToken;
    }
    
    const response = await jiraRequest('/search/jql', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    }, '3');
    
    const data = await response.json();
    allIssues.push(...(data.issues || []));
    nextPageToken = data.nextPageToken || null;
    
    // Stop if we've reached the desired maxResults or there are no more pages
    if (allIssues.length >= maxResults || !nextPageToken) {
      break;
    }
  } while (nextPageToken && allIssues.length < maxResults);
  
  return allIssues.slice(0, maxResults);
}

/**
 * Fetch issues from multiple projects
 */
async function getAllProjectIssues(projectKeys = ['NS', 'COT'], maxResults = 200) {
  const allIssues = [];
  for (const projectKey of projectKeys) {
    try {
      const issues = await getProjectIssues(projectKey, maxResults);
      allIssues.push(...issues);
      console.log(`Fetched ${issues.length} issues from ${projectKey}`);
    } catch (error) {
      console.error(`Error fetching issues from ${projectKey}:`, error.message);
    }
  }
  return allIssues;
}

/**
 * Get a specific issue by key
 */
async function getIssue(issueKey) {
  const response = await jiraRequest(`/issue/${issueKey}`);
  return await response.json();
}

/**
 * Get available transitions for an issue
 */
async function getTransitions(issueKey) {
  const response = await jiraRequest(`/issue/${issueKey}/transitions`);
  const data = await response.json();
  return data.transitions;
}

/**
 * Transition an issue to a new status
 */
async function transitionIssue(issueKey, transitionId) {
  const response = await jiraRequest(`/issue/${issueKey}/transitions`, {
    method: 'POST',
    body: JSON.stringify({
      transition: { id: transitionId }
    })
  });
  return response;
}

/**
 * Transition an issue to "Done" status
 */
async function markIssueDone(issueKey) {
  const transitions = await getTransitions(issueKey);
  const doneTransition = transitions.find(t => 
    t.name.toLowerCase() === 'done' || 
    t.to.name.toLowerCase() === 'done'
  );
  
  if (!doneTransition) {
    throw new Error(`No "Done" transition found for ${issueKey}. Available transitions: ${transitions.map(t => t.name).join(', ')}`);
  }
  
  return await transitionIssue(issueKey, doneTransition.id);
}

/**
 * Add a comment to an issue (supports plain text or structured content)
 */
async function addComment(issueKey, comment, isStructured = false) {
  let body;
  
  if (isStructured) {
    body = comment; // Already in structured format
  } else {
    body = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: comment
            }
          ]
        }
      ]
    };
  }
  
  const response = await jiraRequest(`/issue/${issueKey}/comment`, {
    method: 'POST',
    body: JSON.stringify({ body })
  });
  return await response.json();
}

/**
 * Create structured completion comment with details
 */
function createCompletionComment(completionData) {
  const content = [];
  
  // Summary section
  content.push({
    type: 'paragraph',
    content: [
      { type: 'text', text: 'Summary: ', marks: [{ type: 'strong' }] },
      { type: 'text', text: completionData.summary }
    ]
  });
  
  // Empty line
  content.push({ type: 'paragraph', content: [] });
  
  // Completion Details header
  content.push({
    type: 'paragraph',
    content: [
      { type: 'text', text: 'Completion Details:', marks: [{ type: 'strong' }] }
    ]
  });
  
  // Details as paragraphs with bullet prefix
  completionData.details.forEach(detail => {
    content.push({
      type: 'paragraph',
      content: [
        { type: 'text', text: '• ' },
        { type: 'text', text: detail }
      ]
    });
  });
  
  // Files Modified section
  if (completionData.files && completionData.files.length > 0) {
    content.push({ type: 'paragraph', content: [] });
    content.push({
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Files Modified:', marks: [{ type: 'strong' }] }
      ]
    });
    
    completionData.files.forEach(file => {
      content.push({
        type: 'paragraph',
        content: [
          { type: 'text', text: '• ' },
          { type: 'text', text: file, marks: [{ type: 'code' }] }
        ]
      });
    });
  }
  
  return {
    type: 'doc',
    version: 1,
    content: content
  };
}

/**
 * Update issue with completion details and mark as Done
 */
async function updateIssueCompletion(issueKey, completionData) {
  const results = { issueKey };
  
  try {
    // Add detailed completion comment
    const comment = createCompletionComment(completionData);
    await addComment(issueKey, comment, true);
    console.log(`✅ Added completion comment to ${issueKey}`);
    results.comment = 'success';
    
    // Mark as Done
    await markIssueDone(issueKey);
    console.log(`✅ ${issueKey} marked as Done`);
    results.status = 'success';
    
  } catch (error) {
    console.error(`❌ Failed to update ${issueKey}:`, error.message);
    results.error = error.message;
  }
  
  return results;
}

/**
 * Batch update multiple issues with completion details
 */
async function updateCompletions(issueKeys, keyMapping = {}) {
  const results = [];
  
  // Reverse mapping: actualKey -> expectedKey
  const reverseMapping = {};
  Object.entries(keyMapping).forEach(([expected, actual]) => {
    reverseMapping[actual] = expected;
  });
  
  for (const issueKey of issueKeys) {
    // Find the expected key for this actual key
    const expectedKey = reverseMapping[issueKey] || issueKey;
    
    // Get completion data using expected key
    const completionData = COMPLETION_DETAILS[expectedKey];
    
    if (!completionData) {
      console.warn(`⚠️  No completion data found for ${issueKey} (expected: ${expectedKey}), skipping...`);
      results.push({ issueKey, status: 'skipped', reason: 'No completion data' });
      continue;
    }
    
    // Update using the actual issue key
    const result = await updateIssueCompletion(issueKey, completionData);
    results.push(result);
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
}

/**
 * Update multiple issues to Done status
 */
async function markIssuesDone(issueKeys, addComments = false) {
  const results = [];
  
  for (const issueKey of issueKeys) {
    try {
      await markIssueDone(issueKey);
      console.log(`✅ ${issueKey} marked as Done`);
      
      if (addComments) {
        await addComment(issueKey, 'Status updated via API script');
      }
      
      results.push({ issueKey, status: 'success' });
    } catch (error) {
      console.error(`❌ Failed to update ${issueKey}:`, error.message);
      results.push({ issueKey, status: 'error', error: error.message });
    }
  }
  
  return results;
}

/**
 * Check if an issue exists
 */
async function issueExists(issueKey) {
  try {
    await getIssue(issueKey);
    return true;
  } catch (error) {
    if (error.message.includes('404') || error.message.includes('does not exist')) {
      return false;
    }
    throw error;
  }
}

/**
 * Create a new issue in Jira
 */
async function createIssue(projectKey, issueTypeName, summary, description = '', additionalFields = {}) {
  // Try to get issue type ID if name is provided
  let issueTypeField = { name: issueTypeName };
  
  try {
    const issueTypes = await getIssueTypes(projectKey);
    const matchingType = issueTypes.find(it => it.name.toLowerCase() === issueTypeName.toLowerCase());
    if (matchingType && matchingType.id) {
      issueTypeField = { id: matchingType.id };
    }
  } catch (error) {
    // Fallback to using name if ID lookup fails
    console.warn(`Could not resolve issue type ID for ${issueTypeName}, using name`);
  }
  
  const issueData = {
    fields: {
      project: { key: projectKey },
      summary: summary,
      issuetype: issueTypeField,
      ...additionalFields
    }
  };
  
  if (description) {
    issueData.fields.description = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: description }]
        }
      ]
    };
  }
  
  const response = await jiraRequest('/issue', {
    method: 'POST',
    body: JSON.stringify(issueData)
  });
  
  const created = await response.json();
  return created;
}

/**
 * Create missing COT tickets from COMPLETION_DETAILS
 * 
 * Note: Jira auto-assigns issue numbers sequentially. If COT-203 doesn't exist,
 * creating a new ticket will get the next available number (e.g., COT-27).
 * The script handles this by mapping created tickets to their actual keys.
 */
async function createMissingCotTickets() {
  // Get available issue types for COT project
  const issueTypes = await getIssueTypes('COT');
  const issueTypeMap = {};
  issueTypes.forEach(it => {
    issueTypeMap[it.name.toLowerCase()] = it;
  });
  
  // Map desired types to available types (with fallbacks)
  const getIssueType = (desiredType) => {
    const desired = desiredType.toLowerCase();
    if (issueTypeMap[desired]) {
      return issueTypeMap[desired];
    }
    // Fallback: try Task if Story/Bug not available
    if (issueTypeMap['task']) {
      return issueTypeMap['task'];
    }
    // Last resort: use first available type
    return issueTypes[0] || { name: 'Task', id: '10001' };
  };
  
  const ticketDefinitions = {
    'COT-203': { type: 'Story', epic: 'COT-2', summary: 'Add Move Variety to AI Opponent' },
    'COT-204': { type: 'Bug', epic: 'COT-2', summary: 'Fix Multipv Timeout Error' },
    'COT-205': { type: 'Task', epic: 'COT-2', summary: 'Optimize Multipv Performance' },
    'COT-504': { type: 'Bug', epic: 'COT-5', summary: 'Remove Redundant Connection Status Messages' },
    'COT-505': { type: 'Task', epic: 'COT-5', summary: 'Improve Connection Status UI' },
    'COT-506': { type: 'Task', epic: 'COT-5', summary: 'Improve Opening Badge Clarity' },
    'COT-507': { type: 'Task', epic: 'COT-5', summary: 'Consolidate Refresh Buttons' }
  };
  
  const results = [];
  const keyMapping = {}; // Maps expected key -> actual created key
  
  for (const [expectedKey, def] of Object.entries(ticketDefinitions)) {
    try {
      // Check if ticket already exists with expected key
      const exists = await issueExists(expectedKey);
      if (exists) {
        console.log(`✅ ${expectedKey} already exists, skipping creation`);
        results.push({ issueKey: expectedKey, status: 'exists', skipped: true, actualKey: expectedKey });
        keyMapping[expectedKey] = expectedKey;
        continue;
      }
      
      // Get the appropriate issue type
      const issueType = getIssueType(def.type);
      
      // Create the ticket
      const completionData = COMPLETION_DETAILS[expectedKey];
      const description = completionData 
        ? `${completionData.summary}\n\nThis ticket tracks completed work.`
        : def.summary;
      
      const created = await createIssue('COT', issueType.name, def.summary, description);
      console.log(`✅ Created ${created.key}: ${def.summary} (${issueType.name})`);
      results.push({ issueKey: expectedKey, status: 'created', key: created.key, actualKey: created.key });
      keyMapping[expectedKey] = created.key; // Map expected key to actual key
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ Failed to create ${expectedKey}: ${error.message}`);
      results.push({ issueKey: expectedKey, status: 'error', error: error.message });
    }
  }
  
  // Store mapping globally for use in update function
  if (typeof global !== 'undefined') {
    global.cotTicketMapping = keyMapping;
  }
  
  return { results, keyMapping };
}

/**
 * Get detailed issue information including fields
 */
async function getIssueDetails(issueKey) {
  const issue = await getIssue(issueKey);
  return {
    key: issue.key,
    summary: issue.fields.summary,
    status: issue.fields.status.name,
    assignee: issue.fields.assignee?.displayName || 'Unassigned',
    created: issue.fields.created,
    updated: issue.fields.updated,
    description: issue.fields.description,
    issueType: issue.fields.issuetype.name,
    priority: issue.fields.priority?.name || 'None',
    labels: issue.fields.labels || [],
    components: issue.fields.components?.map(c => c.name) || [],
    fixVersions: issue.fields.fixVersions?.map(v => v.name) || []
  };
}

/**
 * Fetch and display all issues with details
 */
async function fetchAllIssuesWithDetails(projectKeys = ['NS', 'COT']) {
  const issues = await getAllProjectIssues(projectKeys);
  console.log(`\n📊 Total issues found: ${issues.length}\n`);
  
  const details = [];
  for (const issue of issues) {
    try {
      const detail = await getIssueDetails(issue.key);
      details.push(detail);
      console.log(`${detail.key}: ${detail.summary} [${detail.status}]`);
    } catch (error) {
      console.error(`Error fetching details for ${issue.key}:`, error.message);
    }
  }
  
  return details;
}

// Export functions for use as a module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    jiraRequest,
    getProjects,
    getProjectDetails,
    getIssueTypes,
    checkIfScrumIsCot,
    renameProject,
    createProject,
    getProjectIssues,
    getAllProjectIssues,
    getIssue,
    issueExists,
    createIssue,
    createMissingCotTickets,
    getIssueDetails,
    getTransitions,
    transitionIssue,
    markIssueDone,
    addComment,
    createCompletionComment,
    updateIssueCompletion,
    updateCompletions,
    markIssuesDone,
    fetchAllIssuesWithDetails,
    COMPLETION_DETAILS
  };
}

// Example usage (uncomment to run)
(async () => {
  try {
    console.log('🚀 Jira API Script - Checking SCRUM project and setting up COT...\n');
    
    // Step 1: Check if COT project already exists
    console.log('📋 Step 1: Checking if COT project exists...\n');
    let cotExists = false;
    try {
      const cotProject = await getProjectDetails('COT');
      cotExists = true;
      console.log(`✅ COT project already exists: ${cotProject.name} (${cotProject.key})\n`);
    } catch (error) {
      console.log(`⚠️  COT project does not exist: ${error.message}\n`);
    }
    
    // Step 2: Check if SCRUM is actually COT
    console.log('📋 Step 2: Checking if SCRUM project is actually COT...\n');
    let scrumIsCot = false;
    let scrumCheckResult = null;
    
    try {
      scrumCheckResult = await checkIfScrumIsCot();
      scrumIsCot = scrumCheckResult.isCot;
      
      if (scrumCheckResult.error) {
        console.log(`⚠️  Could not check SCRUM project: ${scrumCheckResult.error}\n`);
      } else {
        console.log(`SCRUM project details:`);
        console.log(`  Name: ${scrumCheckResult.project.name}`);
        console.log(`  Key: ${scrumCheckResult.project.key}`);
        console.log(`  Description: ${scrumCheckResult.project.description || 'None'}`);
        console.log(`  Issues found: ${scrumCheckResult.issues.length}`);
        console.log(`\nAnalysis:`);
        console.log(`  Name matches COT: ${scrumCheckResult.analysis.nameMatches}`);
        console.log(`  Has COT keywords: ${scrumCheckResult.analysis.hasCotKeywords}`);
        console.log(`  Has NS keywords: ${scrumCheckResult.analysis.hasNsKeywords}`);
        console.log(`\nConclusion: SCRUM is ${scrumIsCot ? 'COT' : 'NOT COT'}\n`);
      }
    } catch (error) {
      console.error(`❌ Error checking SCRUM project: ${error.message}\n`);
    }
    
    // Step 3: Handle project setup
    console.log('📋 Step 3: Setting up COT project...\n');
    
    if (cotExists) {
      console.log('✅ COT project already exists. No action needed.\n');
    } else if (scrumIsCot) {
      console.log('🔄 Renaming SCRUM project to COT...\n');
      try {
        const renamed = await renameProject(
          'SCRUM',
          'COT',
          'Chess Opening Trainer',
          'Chess Opening Trainer - Interactive chess opening training platform'
        );
        console.log(`✅ Successfully renamed SCRUM to COT!`);
        console.log(`   New key: ${renamed.key}`);
        console.log(`   New name: ${renamed.name}\n`);
      } catch (error) {
        console.error(`❌ Failed to rename SCRUM to COT: ${error.message}`);
        console.error(`   Note: This requires Administer Jira global permission.\n`);
      }
    } else {
      console.log('🆕 Creating new COT project...\n');
      try {
        const created = await createProject(
          'COT',
          'Chess Opening Trainer',
          'software',
          'com.atlassian.jira-core-project-templates:jira-core-simplified-process-control',
          'Chess Opening Trainer - Interactive chess opening training platform'
        );
        console.log(`✅ Successfully created COT project!`);
        console.log(`   Key: ${created.key}`);
        console.log(`   ID: ${created.id}\n`);
      } catch (error) {
        console.error(`❌ Failed to create COT project: ${error.message}`);
        console.error(`   Note: This requires Create Projects global permission.\n`);
      }
    }
    
    // Step 4: Fetch issues from COT project
    console.log('📋 Step 4: Fetching issues from COT project...\n');
    try {
      const cotIssues = await getProjectIssues('COT', 50);
      console.log(`Found ${cotIssues.length} issues in COT project:\n`);
      if (cotIssues.length > 0) {
        cotIssues.forEach(issue => {
          console.log(`  ${issue.key}: ${issue.fields.summary} [${issue.fields.status.name}]`);
        });
      } else {
        console.log('  No issues found in COT project yet.\n');
      }
      console.log('');
    } catch (error) {
      console.error(`Error fetching COT issues: ${error.message}\n`);
    }
    
    // Step 5: Create missing COT tickets
    console.log('📋 Step 5: Creating missing COT tickets...\n');
    const createResult = await createMissingCotTickets();
    const createResults = createResult.results;
    const keyMapping = createResult.keyMapping || {};
    
    const created = createResults.filter(r => r.status === 'created').length;
    const alreadyExists = createResults.filter(r => r.status === 'exists').length;
    const createFailed = createResults.filter(r => r.status === 'error').length;
    
    if (created > 0) {
      console.log(`\n✅ Created ${created} new tickets`);
    }
    if (alreadyExists > 0) {
      console.log(`ℹ️  ${alreadyExists} tickets already exist`);
    }
    if (createFailed > 0) {
      console.log(`⚠️  Failed to create ${createFailed} tickets`);
    }
    console.log('');
    
    // Step 6: Update completions for COT tickets
    // Get all actual keys (either from mapping or use expected keys if they exist)
    const ticketsToUpdate = [];
    Object.keys(COMPLETION_DETAILS).forEach(expectedKey => {
      const actualKey = keyMapping[expectedKey] || expectedKey;
      ticketsToUpdate.push(actualKey);
    });
    
    console.log(`📋 Step 6: Updating ${ticketsToUpdate.length} COT tickets with completion details...\n`);
    
    // Wait a moment for tickets to be fully indexed
    if (created > 0) {
      console.log('⏳ Waiting for tickets to be indexed...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    const updateResults = await updateCompletions(ticketsToUpdate, keyMapping);
    
    console.log('\n📊 Final Summary:');
    console.log('═'.repeat(60));
    
    const successful = updateResults.filter(r => r.status === 'success').length;
    const failed = updateResults.filter(r => r.error).length;
    const skipped = updateResults.filter(r => r.status === 'skipped').length;
    
    console.log('\n📝 Ticket Creation:');
    console.log(`  ✅ Created: ${created}`);
    console.log(`  ℹ️  Already existed: ${alreadyExists}`);
    console.log(`  ❌ Failed: ${createFailed}`);
    
    console.log('\n🔄 Ticket Updates:');
    console.log(`  ✅ Successfully updated: ${successful}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  ⚠️  Skipped: ${skipped}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed updates:');
      updateResults.filter(r => r.error).forEach(r => {
        console.log(`  • ${r.issueKey}: ${r.error.split('\n')[0]}`);
      });
    }
    
    if (createFailed > 0) {
      console.log('\n❌ Failed creations:');
      createResults.filter(r => r.status === 'error').forEach(r => {
        console.log(`  • ${r.issueKey}: ${r.error.split('\n')[0]}`);
      });
    }
    
    const totalSuccess = successful + created;
    if (totalSuccess > 0) {
      console.log(`\n🎉 Successfully processed ${totalSuccess} tickets!`);
    }
    
    console.log('\n✨ Script completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();