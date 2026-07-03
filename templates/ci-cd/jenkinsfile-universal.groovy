// 🚀 Universal CI/CD Pipeline Template (Jenkins)
// Works with ANY Next.js/Node.js project
// Part of Universal Deploy Bundle

pipeline {
    agent any

    // Global environment variables
    environment {
        NODE_VERSION = '18'
        DEPLOY_TIMEOUT = '15'
        SSH_HOST = credentials('ssh-host')
        SSH_USER = credentials('ssh-user')
        SSH_KEY_PATH = credentials('ssh-key-path')
        DEPLOY_URL = credentials('deploy-url')
        ENTERPRISE_LICENSE_KEY = credentials('enterprise-license-key')
    }

    // Build parameters
    parameters {
        choice(
            name: 'ENVIRONMENT',
            choices: ['staging', 'production'],
            description: 'Choose deployment environment'
        )
        booleanParam(
            name: 'RUN_SECURITY_SCAN',
            defaultValue: true,
            description: 'Run security vulnerability scan'
        )
        booleanParam(
            name: 'RUN_AI_AUTOMATION',
            defaultValue: false,
            description: 'Enable AI automation (Enterprise only)'
        )
    }

    options {
        // Keep last 30 builds
        buildDiscarder(logRotator(numToKeepStr: '30'))

        // Timeout after 1 hour
        timeout(time: 1, unit: 'HOURS')

        // Disable concurrent builds
        disableConcurrentBuilds()

        // Add timestamps to console output
        timestamps()
    }

    stages {

        // ============================================================
        // STAGE 1: Security Scanning (FREE & ENTERPRISE)
        // ============================================================
        stage('Security Scan') {
            when {
                expression { params.RUN_SECURITY_SCAN }
            }
            parallel {
                stage('Free Security Scan') {
                    steps {
                        script {
                            echo '🔍 Running free security scan...'
                            sh '''
                                npm install -g @universal-deploy/bundle || echo "Using local bundle"
                                npm run security || node core/security-scanner.js
                            '''
                        }
                    }
                    post {
                        always {
                            archiveArtifacts artifacts: 'security-report.json', allowEmptyArchive: true
                        }
                    }
                }

                stage('Enterprise Security Scan') {
                    when {
                        expression { env.ENTERPRISE_LICENSE_KEY != '' }
                    }
                    steps {
                        script {
                            echo '🔒 Running enterprise security scan...'
                            sh '''
                                node core/security-scanner.js --enterprise --compliance
                            '''
                        }
                    }
                    post {
                        always {
                            archiveArtifacts artifacts: 'enterprise-security-report.json', allowEmptyArchive: true
                        }
                    }
                }
            }
        }

        // ============================================================
        // STAGE 2: Code Quality & Zero-Error Verification
        // ============================================================
        stage('Zero-Error Verification') {
            steps {
                script {
                    echo '✅ Running zero-error verification...'
                    sh '''
                        cd frontend || npm install
                        npm ci
                        npm run verify-zero-errors || node scripts/verify-zero-errors.js
                    '''
                }
            }
        }

        stage('TypeScript Check') {
            steps {
                script {
                    echo '🔍 Checking TypeScript types...'
                    sh '''
                        cd frontend || npm install
                        npx tsc --noEmit
                    '''
                }
            }
        }

        stage('ESLint Check') {
            steps {
                script {
                    echo '🔍 Running ESLint...'
                    sh '''
                        npm run lint || npx eslint .
                    '''
                }
            }
        }

        // ============================================================
        // STAGE 3: Build Frontend & Backend
        // ============================================================
        stage('Build') {
            parallel {
                stage('Build Frontend') {
                    steps {
                        script {
                            echo '🏗️ Building frontend...'
                            sh '''
                                cd frontend
                                npm ci
                                npm run build
                            '''
                        }
                    }
                }

                stage('Build Backend') {
                    steps {
                        script {
                            echo '🏗️ Building backend...'
                            sh '''
                                cd backend
                                npm ci
                                npm run build
                            '''
                        }
                    }
                }
            }
        }

        // ============================================================
        // STAGE 4: Runtime Error Testing
        // ============================================================
        stage('Runtime Testing') {
            steps {
                script {
                    echo '🧪 Running runtime error tests...'
                    sh '''
                        npm ci
                        npx playwright install --with-deps
                        npm run test:e2e:runtime || npx playwright test e2e/runtime-errors.spec.ts
                    '''
                }
            }
            post {
                always {
                    // Archive test results
                    archiveArtifacts artifacts: 'playwright-report/**/*', allowEmptyArchive: true
                    archiveArtifacts artifacts: 'test-results/**/*', allowEmptyArchive: true

                    // Publish HTML report
                    publishHTML([
                        reportDir: 'playwright-report',
                        reportFiles: 'index.html',
                        reportName: 'Playwright Report',
                        alwaysLinkToLastBuild: true,
                        keepAll: true
                    ])
                }
            }
        }

        // ============================================================
        // STAGE 5: Deploy to Environment
        // ============================================================
        stage('Deploy') {
            when {
                anyOf {
                    branch 'main'
                    branch 'master'
                    branch 'staging'
                }
            }

            steps {
                script {
                    echo "🚀 Deploying to ${params.ENVIRONMENT}..."
                    sh """
                        npm install -g @universal-deploy-bundle || echo "Using local bundle"
                        node core/intelligent-deployer-universal.js ${params.ENVIRONMENT} \
                          --ssh ${SSH_USER}@${SSH_HOST} \
                          --ssh-key-path ${SSH_KEY_PATH} \
                          --url ${DEPLOY_URL} \
                          --force-continue
                    """
                }
            }

            post {
                success {
                    script {
                        echo """
                        🎉 **Deployment Complete**
                        **Environment:** ${params.ENVIRONMENT}
                        **URL:** ${DEPLOY_URL}
                        **Commit:** ${env.GIT_COMMIT}
                        **Build:** ${env.BUILD_NUMBER}
                        """
                    }
                }
                failure {
                    script {
                        echo '❌ Deployment failed!'
                    }
                }
            }
        }

        // ============================================================
        // STAGE 6: Post-Deployment Verification
        // ============================================================
        stage('Post-Deploy Verification') {
            steps {
                script {
                    echo '🔍 Running post-deployment verification...'
                    sh '''
                        npm run verify-runtime || node scripts/verify-runtime-errors.js
                    '''
                }
            }
        }

        stage('Post-Deploy Security Scan') {
            steps {
                script {
                    echo '🔒 Running post-deployment security scan...'
                    sh '''
                        npm run security:scan || node core/security-scanner.js
                    '''
                }
            }
        }

        // ============================================================
        // STAGE 7: AI Automation (ENTERPRISE)
        // ============================================================
        stage('AI Automation') {
            when {
                allOf {
                    expression { params.RUN_AI_AUTOMATION }
                    expression { env.ENTERPRISE_LICENSE_KEY != '' }
                }
            }

            parallel {
                stage('Enable Self-Healing') {
                    steps {
                        script {
                            echo '🤖 Enabling self-healing...'
                            sh '''
                                node core/ai-automation-interface.js --enterprise --enable-self-healing
                            '''
                        }
                    }
                }

                stage('Enable Anomaly Detection') {
                    steps {
                        script {
                            echo '🔍 Enabling anomaly detection...'
                            sh '''
                                node core/ai-automation-interface.js --enterprise --enable-anomaly
                            '''
                        }
                    }
                }

                stage('Scaling Predictions') {
                    steps {
                        script {
                            echo '📊 Getting scaling predictions...'
                            sh '''
                                node core/ai-automation-interface.js --enterprise --predict > predictions.json
                            '''
                        }
                    }
                    post {
                        always {
                            archiveArtifacts artifacts: 'predictions.json', allowEmptyArchive: true
                        }
                    }
                }
            }
        }
    }

    post {

        // Success notification
        success {
            script {
                echo '📢 Sending success notification...'
                // Slack notification (if configured)
                slackSend(
                    color: 'good',
                    message: """
                        🎉 Deployment Successful!

                        Project: ${env.JOB_NAME}
                        Environment: ${params.ENVIRONMENT}
                        Build: ${env.BUILD_NUMBER}
                        Commit: ${env.GIT_COMMIT.take(7)}
                        Author: ${env.CHANGE_AUTHOR}
                        URL: ${DEPLOY_URL}
                    """.stripIndent()
                )

                // Email notification
                emailext(
                    subject: "✅ Deployment Successful: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                    body: """
                        <h2>🎉 Deployment Successful!</h2>
                        <p><strong>Project:</strong> ${env.JOB_NAME}</p>
                        <p><strong>Environment:</strong> ${params.ENVIRONMENT}</p>
                        <p><strong>Build:</strong> ${env.BUILD_NUMBER}</p>
                        <p><strong>Commit:</strong> ${env.GIT_COMMIT}</p>
                        <p><strong>URL:</strong> ${DEPLOY_URL}</p>
                        <p><strong>Duration:</strong> ${currentBuild.durationString}</p>
                    """,
                    to: '${CHANGED_AUTHOR_EMAIL},devops@example.com',
                    mimeType: 'text/html'
                )
            }
        }

        // Failure notification
        failure {
            script {
                echo '📢 Sending failure notification...'

                // Slack notification
                slackSend(
                    color: 'danger',
                    message: """
                        ❌ Deployment Failed!

                        Project: ${env.JOB_NAME}
                        Environment: ${params.ENVIRONMENT}
                        Build: ${env.BUILD_NUMBER}
                        Commit: ${env.GIT_COMMIT.take(7)}
                        URL: ${env.BUILD_URL}console
                    """.stripIndent()
                )

                // Email notification
                emailext(
                    subject: "❌ Deployment Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                    body: """
                        <h2>❌ Deployment Failed!</h2>
                        <p><strong>Project:</strong> ${env.JOB_NAME}</p>
                        <p><strong>Environment:</strong> ${params.ENVIRONMENT}</p>
                        <p><strong>Build:</strong> ${env.BUILD_NUMBER}</p>
                        <p><strong>Commit:</strong> ${env.GIT_COMMIT}</p>
                        <p><strong>Build URL:</strong> ${env.BUILD_URL}console</p>
                        <p><strong>Duration:</strong> ${currentBuild.durationString}</p>
                    """,
                    to: '${CHANGED_AUTHOR_EMAIL},devops@example.com',
                    mimeType: 'text/html'
                )
            }
        }

        // Always clean up
        always {
            script {
                echo '🧹 Cleaning up...'
                cleanWs()
            }
        }
    }
}

// ============================================================
// USAGE INSTRUCTIONS
// ============================================================
//
// FREE VERSION SETUP:
// 1. Add credentials in Jenkins:
//    - ssh-host: your-server.com
//    - ssh-user: root
//    - ssh-key-path: ~/.ssh/id_rsa
//    - deploy-url: https://your-app.com
//
// 2. Install required plugins:
//    - Node.js Plugin
//    - Slack Notification Plugin
//    - Email Extension Plugin
//    - HTML Publisher Plugin
//
// 3. Configure Jenkins with Node.js
//
// ENTERPRISE VERSION SETUP:
// 1. Add all FREE version credentials
// 2. Add enterprise license key:
//    - enterprise-license-key: your-license-key
// 3. Enable AI automation in build parameters
//
// CUSTOMIZATION:
// - Adjust NODE_VERSION for your project
// - Change DEPLOY_TIMEOUT for longer builds
// - Add custom test stages
// - Configure notification channels
// - Add manual approval stages
// - Configure parallel execution
