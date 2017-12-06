#!groovy

// https://github.com/feedhenry/fh-pipeline-library
@Library('fh-pipeline-library') _

stage('Trust') {
    enforceTrustedApproval()
}

fhBuildNode([labels: ['nodejs6']]) {

    final String COMPONENT = 'fh-mbaas'
    final String VERSION = getBaseVersionFromPackageJson()
    final String BUILD = env.BUILD_NUMBER
    final String DOCKER_HUB_ORG = "feedhenry"
    final String CHANGE_URL = env.CHANGE_URL

    stage('Install Dependencies') {
        npmInstall {}
        withPrivateNPMRegistry {
            sh 'npm install fh-dfc@0.24.4-75'
        }
    }

    stage('Lint') {
        print 'Lint task is broken see https://issues.jboss.org/browse/FH-3611'
        //sh 'grunt eslint'
    }

    withOpenshiftServices(['mongodb']) {
        stage('Unit Tests') {
            sh 'grunt fh-unit'
        }

        stage('Acceptance Tests') {
            sh 'grunt fh-accept'
        }
    }

    stage('Build') {
        gruntBuild {
            name = COMPONENT
        }
    }

    stage('Platform Update') {
        final Map updateParams = [
                componentName: COMPONENT,
                componentVersion: VERSION,
                componentBuild: BUILD,
                changeUrl: CHANGE_URL
        ]
        fhOpenshiftTemplatesComponentUpdate(updateParams)
    }

    stage('Build Image') {
        dockerBuildNodeComponent(COMPONENT, DOCKER_HUB_ORG)
    }
}
