import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger.js';

export interface CodebaseAnalysis {
  projectType: string;
  framework: string;
  language: string;
  packageManager: string;
  dependencies: string[];
  databaseType?: string;
  authMethods: string[];
  apiPatterns: string[];
  configFiles: string[];
  environmentVariables: string[];
  suggestedIntegrations: TimeBackIntegrationSuggestion[];
}

export interface TimeBackIntegrationSuggestion {
  api: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  dataModels: string[];
  endpoints: string[];
  environmentVars: string[];
  implementationSteps: string[];
  codeExamples: string[];
}

export class CodebaseAnalyzer {
  private readonly supportedExtensions = ['.js', '.ts', '.py', '.java', '.cs', '.php', '.rb', '.go'];
  private readonly configFiles = [
    'package.json', 'requirements.txt', 'pom.xml', 'build.gradle', 
    'composer.json', 'Gemfile', 'go.mod', 'pyproject.toml', 'setup.py',
    '.env', '.env.example', 'config.json', 'appsettings.json'
  ];

  async analyzeCodebase(projectPath: string): Promise<CodebaseAnalysis> {
    logger.info(`Analyzing codebase at: ${projectPath}`);
    
    const analysis: CodebaseAnalysis = {
      projectType: 'unknown',
      framework: 'unknown',
      language: 'unknown',
      packageManager: 'unknown',
      dependencies: [],
      authMethods: [],
      apiPatterns: [],
      configFiles: [],
      environmentVariables: [],
      suggestedIntegrations: [],
    };

    try {
      const files = await this.getProjectFiles(projectPath);
      analysis.configFiles = files.filter(f => this.configFiles.includes(path.basename(f)));
      
      await this.detectLanguageAndFramework(projectPath, files, analysis);
      
      await this.analyzeDependencies(projectPath, analysis);
      
      await this.detectAuthPatterns(files, analysis);
      
      await this.detectApiPatterns(files, analysis);
      
      await this.extractEnvironmentVariables(projectPath, analysis);
      
      analysis.suggestedIntegrations = await this.generateTimeBackSuggestions(analysis);
      
      logger.info(`Codebase analysis completed for ${analysis.language} ${analysis.framework} project`);
      return analysis;
      
    } catch (error) {
      logger.error('Codebase analysis failed:', error);
      throw error;
    }
  }

  private async getProjectFiles(projectPath: string): Promise<string[]> {
    const files: string[] = [];
    
    const traverse = async (dir: string, depth = 0): Promise<void> => {
      if (depth > 3) return; // Limit depth to avoid deep node_modules
      
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            if (!['node_modules', '.git', 'dist', 'build', '__pycache__', 'target'].includes(entry.name)) {
              await traverse(fullPath, depth + 1);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (this.supportedExtensions.includes(ext) || this.configFiles.includes(entry.name)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        logger.warn(`Could not read directory ${dir}:`, error);
      }
    };
    
    await traverse(projectPath);
    return files;
  }

  private async detectLanguageAndFramework(projectPath: string, files: string[], analysis: CodebaseAnalysis): Promise<void> {
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (files.includes(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        analysis.language = files.some(f => f.endsWith('.ts')) ? 'typescript' : 'javascript';
        analysis.packageManager = await this.detectNodePackageManager(projectPath);
        
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        if (deps.express) analysis.framework = 'express';
        else if (deps.fastify) analysis.framework = 'fastify';
        else if (deps.koa) analysis.framework = 'koa';
        else if (deps.next) analysis.framework = 'nextjs';
        else if (deps.react) analysis.framework = 'react';
        else if (deps.vue) analysis.framework = 'vue';
        else if (deps.angular) analysis.framework = 'angular';
        else analysis.framework = 'nodejs';
        
        analysis.projectType = deps.react || deps.vue || deps.angular ? 'frontend' : 'backend';
        return;
      } catch (error) {
        logger.warn('Could not parse package.json:', error);
      }
    }

    if (files.some(f => f.endsWith('.py'))) {
      analysis.language = 'python';
      
      const pythonFiles = files.filter(f => f.endsWith('.py'));
      const content = await this.readMultipleFiles(pythonFiles.slice(0, 10)); // Sample first 10 files
      
      if (content.includes('from fastapi') || content.includes('import fastapi')) {
        analysis.framework = 'fastapi';
        analysis.projectType = 'backend';
      } else if (content.includes('from flask') || content.includes('import flask')) {
        analysis.framework = 'flask';
        analysis.projectType = 'backend';
      } else if (content.includes('from django') || content.includes('import django')) {
        analysis.framework = 'django';
        analysis.projectType = 'backend';
      } else {
        analysis.framework = 'python';
        analysis.projectType = 'backend';
      }
      
      if (files.some(f => f.endsWith('pyproject.toml'))) analysis.packageManager = 'poetry';
      else if (files.some(f => f.endsWith('requirements.txt'))) analysis.packageManager = 'pip';
      else analysis.packageManager = 'pip';
      
      return;
    }

    if (files.some(f => f.endsWith('.java'))) {
      analysis.language = 'java';
      analysis.projectType = 'backend';
      
      if (files.some(f => f.includes('pom.xml'))) {
        analysis.packageManager = 'maven';
        try {
          const pomContent = await fs.readFile(files.find(f => f.includes('pom.xml'))!, 'utf-8');
          if (pomContent.includes('spring-boot')) {
            analysis.framework = 'spring-boot';
          }
        } catch (error) {
          logger.warn('Could not read pom.xml:', error);
        }
      } else if (files.some(f => f.includes('build.gradle'))) {
        analysis.packageManager = 'gradle';
      }
      
      return;
    }

    const extensions = files.map(f => path.extname(f));
    const mostCommon = this.getMostCommonExtension(extensions);
    
    switch (mostCommon) {
      case '.js': analysis.language = 'javascript'; break;
      case '.ts': analysis.language = 'typescript'; break;
      case '.py': analysis.language = 'python'; break;
      case '.java': analysis.language = 'java'; break;
      case '.cs': analysis.language = 'csharp'; break;
      case '.php': analysis.language = 'php'; break;
      case '.rb': analysis.language = 'ruby'; break;
      case '.go': analysis.language = 'go'; break;
    }
  }

  private async detectNodePackageManager(projectPath: string): Promise<string> {
    if (await this.fileExists(path.join(projectPath, 'pnpm-lock.yaml'))) return 'pnpm';
    if (await this.fileExists(path.join(projectPath, 'yarn.lock'))) return 'yarn';
    if (await this.fileExists(path.join(projectPath, 'package-lock.json'))) return 'npm';
    return 'npm';
  }

  private async analyzeDependencies(projectPath: string, analysis: CodebaseAnalysis): Promise<void> {
    try {
      if (analysis.language === 'javascript' || analysis.language === 'typescript') {
        const packageJsonPath = path.join(projectPath, 'package.json');
        if (await this.fileExists(packageJsonPath)) {
          const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
          const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
          analysis.dependencies = Object.keys(deps);
        }
      } else if (analysis.language === 'python') {
        const pyprojectPath = path.join(projectPath, 'pyproject.toml');
        if (await this.fileExists(pyprojectPath)) {
          const content = await fs.readFile(pyprojectPath, 'utf-8');
          const matches = content.match(/^\s*([a-zA-Z0-9_-]+)\s*=/gm);
          if (matches) {
            analysis.dependencies = matches.map(m => m.split('=')[0].trim());
          }
        } else {
          const reqPath = path.join(projectPath, 'requirements.txt');
          if (await this.fileExists(reqPath)) {
            const content = await fs.readFile(reqPath, 'utf-8');
            analysis.dependencies = content.split('\n')
              .filter(line => line.trim() && !line.startsWith('#'))
              .map(line => line.split(/[>=<]/)[0].trim());
          }
        }
      }
    } catch (error) {
      logger.warn('Could not analyze dependencies:', error);
    }
  }

  private async detectAuthPatterns(files: string[], analysis: CodebaseAnalysis): Promise<void> {
    const authKeywords = [
      'jwt', 'oauth', 'passport', 'auth0', 'firebase-auth', 'cognito',
      'session', 'cookie', 'bearer', 'token', 'authentication', 'authorization'
    ];
    
    const sampleFiles = files.filter(f => 
      f.includes('auth') || f.includes('login') || f.includes('security')
    ).slice(0, 5);
    
    if (sampleFiles.length === 0) {
      sampleFiles.push(...files.slice(0, 10));
    }
    
    const content = await this.readMultipleFiles(sampleFiles);
    const lowerContent = content.toLowerCase();
    
    for (const keyword of authKeywords) {
      if (lowerContent.includes(keyword)) {
        analysis.authMethods.push(keyword);
      }
    }
    
    analysis.authMethods = [...new Set(analysis.authMethods)];
  }

  private async detectApiPatterns(files: string[], analysis: CodebaseAnalysis): Promise<void> {
    const apiPatterns = [
      'rest', 'graphql', 'grpc', 'websocket', 'sse',
      'express.router', 'app.get', 'app.post', '@app.route',
      'fetch(', 'axios.', 'http.get', 'requests.get'
    ];
    
    const sampleFiles = files.filter(f => 
      f.includes('api') || f.includes('route') || f.includes('controller') || f.includes('service')
    ).slice(0, 10);
    
    if (sampleFiles.length === 0) {
      sampleFiles.push(...files.slice(0, 15));
    }
    
    const content = await this.readMultipleFiles(sampleFiles);
    const lowerContent = content.toLowerCase();
    
    for (const pattern of apiPatterns) {
      if (lowerContent.includes(pattern.toLowerCase())) {
        analysis.apiPatterns.push(pattern);
      }
    }
    
    analysis.apiPatterns = [...new Set(analysis.apiPatterns)];
  }

  private async extractEnvironmentVariables(projectPath: string, analysis: CodebaseAnalysis): Promise<void> {
    const envFiles = ['.env', '.env.example', '.env.local', '.env.development'];
    
    for (const envFile of envFiles) {
      const envPath = path.join(projectPath, envFile);
      if (await this.fileExists(envPath)) {
        try {
          const content = await fs.readFile(envPath, 'utf-8');
          const vars = content.split('\n')
            .filter(line => line.includes('=') && !line.startsWith('#'))
            .map(line => line.split('=')[0].trim());
          analysis.environmentVariables.push(...vars);
        } catch (error) {
          logger.warn(`Could not read ${envFile}:`, error);
        }
      }
    }
    
    analysis.environmentVariables = [...new Set(analysis.environmentVariables)];
  }

  private async generateTimeBackSuggestions(analysis: CodebaseAnalysis): Promise<TimeBackIntegrationSuggestion[]> {
    const suggestions: TimeBackIntegrationSuggestion[] = [];
    
    if (this.hasUserManagement(analysis)) {
      suggestions.push({
        api: 'oneroster',
        reason: 'Detected user/student management patterns in codebase',
        priority: 'high',
        dataModels: ['User', 'Class', 'Enrollment', 'AcademicSession'],
        endpoints: ['/users', '/classes', '/enrollments', '/academicSessions'],
        environmentVars: ['TIMEBACK_ONEROSTER_BASE_URL', 'ONEROSTER_CLIENT_ID', 'ONEROSTER_CLIENT_SECRET'],
        implementationSteps: [
          'Set up OneRoster authentication',
          'Sync user data from OneRoster',
          'Map OneRoster users to your user model',
          'Implement periodic sync for roster updates'
        ],
        codeExamples: [
          `// Fetch users from OneRoster
const response = await fetch('/oneroster/v1p1/users', {
  headers: { 'Authorization': 'Bearer ' + token }
});
const users = await response.json();`
        ]
      });
    }

    if (this.hasAssessmentFeatures(analysis)) {
      suggestions.push({
        api: 'qti',
        reason: 'Detected assessment or testing functionality',
        priority: 'high',
        dataModels: ['AssessmentTest', 'AssessmentItem', 'TestResult', 'ItemResult'],
        endpoints: ['/assessments', '/items', '/results', '/sessions'],
        environmentVars: ['TIMEBACK_QTI_BASE_URL', 'QTI_CLIENT_ID', 'QTI_CLIENT_SECRET'],
        implementationSteps: [
          'Create QTI assessment definitions',
          'Implement test delivery interface',
          'Handle test sessions and responses',
          'Process and store assessment results'
        ],
        codeExamples: [
          `// Create assessment session
const session = await qtiClient.createSession({
  assessmentId: 'test-123',
  candidateId: 'student-456'
});`
        ]
      });
    }

    if (this.hasAnalyticsFeatures(analysis)) {
      suggestions.push({
        api: 'caliper',
        reason: 'Detected analytics or tracking functionality',
        priority: 'medium',
        dataModels: ['Event', 'Person', 'DigitalResource', 'Session'],
        endpoints: ['/events', '/entities', '/profiles'],
        environmentVars: ['TIMEBACK_CALIPER_BASE_URL', 'CALIPER_API_KEY'],
        implementationSteps: [
          'Identify learning events to track',
          'Implement Caliper event generation',
          'Send events to Caliper endpoint',
          'Set up analytics dashboards'
        ],
        codeExamples: [
          `// Send learning event to Caliper
const event = {
  type: 'NavigationEvent',
  actor: { id: 'student-123' },
  object: { id: 'lesson-456' },
  eventTime: new Date().toISOString()
};
await caliperClient.sendEvent(event);`
        ]
      });
    }

    if (this.hasLearningPathFeatures(analysis)) {
      suggestions.push({
        api: 'powerpath',
        reason: 'Detected learning path or adaptive learning features',
        priority: 'medium',
        dataModels: ['LearningObjective', 'MasteryMeasurement', 'LearningPath'],
        endpoints: ['/objectives', '/mastery', '/paths', '/recommendations'],
        environmentVars: ['TIMEBACK_POWERPATH_BASE_URL', 'POWERPATH_CLIENT_ID'],
        implementationSteps: [
          'Define learning objectives',
          'Implement mastery tracking',
          'Create adaptive learning paths',
          'Generate personalized recommendations'
        ],
        codeExamples: [
          `// Update mastery level
await powerpathClient.updateMastery({
  studentId: 'student-123',
  objectiveId: 'math-algebra-1',
  masteryLevel: 0.85
});`
        ]
      });
    }

    if (this.hasStandardsFeatures(analysis)) {
      suggestions.push({
        api: 'case',
        reason: 'Detected curriculum or standards-related functionality',
        priority: 'low',
        dataModels: ['CFDocument', 'CFItem', 'CFAssociation', 'CFRubric'],
        endpoints: ['/documents', '/items', '/associations', '/rubrics'],
        environmentVars: ['TIMEBACK_CASE_BASE_URL', 'CASE_CLIENT_ID'],
        implementationSteps: [
          'Import standards frameworks',
          'Align content to standards',
          'Track standards coverage',
          'Generate alignment reports'
        ],
        codeExamples: [
          `// Fetch standards framework
const framework = await caseClient.getDocument({
  documentId: 'common-core-math'
});`
        ]
      });
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private hasUserManagement(analysis: CodebaseAnalysis): boolean {
    const indicators = ['user', 'student', 'teacher', 'auth', 'login', 'profile', 'account'];
    return indicators.some(indicator => 
      analysis.dependencies.some(dep => dep.toLowerCase().includes(indicator)) ||
      analysis.apiPatterns.some(pattern => pattern.toLowerCase().includes(indicator))
    );
  }

  private hasAssessmentFeatures(analysis: CodebaseAnalysis): boolean {
    const indicators = ['test', 'quiz', 'assessment', 'exam', 'question', 'answer', 'score', 'grade'];
    return indicators.some(indicator => 
      analysis.dependencies.some(dep => dep.toLowerCase().includes(indicator)) ||
      analysis.apiPatterns.some(pattern => pattern.toLowerCase().includes(indicator))
    );
  }

  private hasAnalyticsFeatures(analysis: CodebaseAnalysis): boolean {
    const indicators = ['analytics', 'tracking', 'metrics', 'events', 'logging', 'stats'];
    return indicators.some(indicator => 
      analysis.dependencies.some(dep => dep.toLowerCase().includes(indicator)) ||
      analysis.apiPatterns.some(pattern => pattern.toLowerCase().includes(indicator))
    );
  }

  private hasLearningPathFeatures(analysis: CodebaseAnalysis): boolean {
    const indicators = ['learning', 'course', 'lesson', 'curriculum', 'progress', 'adaptive', 'recommendation'];
    return indicators.some(indicator => 
      analysis.dependencies.some(dep => dep.toLowerCase().includes(indicator)) ||
      analysis.apiPatterns.some(pattern => pattern.toLowerCase().includes(indicator))
    );
  }

  private hasStandardsFeatures(analysis: CodebaseAnalysis): boolean {
    const indicators = ['standard', 'curriculum', 'competency', 'framework', 'alignment', 'rubric'];
    return indicators.some(indicator => 
      analysis.dependencies.some(dep => dep.toLowerCase().includes(indicator)) ||
      analysis.apiPatterns.some(pattern => pattern.toLowerCase().includes(indicator))
    );
  }

  private async readMultipleFiles(filePaths: string[]): Promise<string> {
    const contents: string[] = [];
    
    for (const filePath of filePaths.slice(0, 10)) { // Limit to avoid memory issues
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        contents.push(content);
      } catch (error) {
        logger.warn(`Could not read file ${filePath}:`, error);
      }
    }
    
    return contents.join('\n');
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private getMostCommonExtension(extensions: string[]): string {
    const counts = extensions.reduce((acc, ext) => {
      acc[ext] = (acc[ext] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '.js';
  }
}
