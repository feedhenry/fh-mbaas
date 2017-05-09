node('nodejs-ubuntu') {
    stage ('Checkout') {
        checkout scm
    }

    stage('Install dependencies') {
      sh '''
        npm install --production
        npm ls
      '''
    }

    stage('Install development dependencies') {
      sh 'npm install'
    }

    stage('Build artifact') {
      sh 'grunt fh:dist'
    }
}
