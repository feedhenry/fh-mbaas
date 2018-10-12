#!groovy

// https://github.com/feedhenry/fh-pipeline-library
@Library('fh-pipeline-library') _

final String COMPONENT = 'fh-mbaas'
final String DOCKER_HUB_ORG = "feedhenry"

String BUILD = ""
String VERSION = ""
String CHANGE_URL = ""

stage('Trust') {
    enforceTrustedApproval()
}

fhBuildNode([labels: ['nodejs6']]) {

    VERSION = getBaseVersionFromPackageJson()
    BUILD = env.BUILD_NUMBER
    CHANGE_URL = env.CHANGE_URL

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

        sh "cp ./dist/fh-*x64.tar.gz docker/"
        stash name: "dockerdir", includes: "docker/"
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
}

node('master') {
    stage('Build Image') {
        unstash "dockerdir"

        final String tag = "${VERSION}-${BUILD}"
        final Map params = [
            fromDir: "./docker",
            buildConfigName: COMPONENT,
            imageRepoSecret: "dockerhub",
            outputImage: "docker.io/${DOCKER_HUB_ORG}/${COMPONENT}:${tag}"
        ]

        try {
            buildWithDockerStrategy params
        } finally {
            sh "rm -rf ./docker/"
        }
    }
}
