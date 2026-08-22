param location string
param tags object
param appServicePlanName string
param appServiceName string
param applicationInsightsConnectionString string

@secure()
param githubToken string = ''
param copilotModel string = 'gpt-4o'

// App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: appServicePlanName
  location: location
  tags: tags
  sku: {
    name: 'B1'
    tier: 'Basic'
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

// App Service
resource appService 'Microsoft.Web/sites@2022-09-01' = {
  name: appServiceName
  location: location
  tags: union(tags, { 'azd-service-name': 'api' })
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      alwaysOn: true
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      appCommandLine: 'npm run start'
      appSettings: [
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: applicationInsightsConnectionString
        }
        {
          name: 'NODE_ENV'
          value: 'production'
        }
        {
          name: 'GITHUB_TOKEN'
          value: githubToken
        }
        {
          name: 'COPILOT_MODEL'
          value: copilotModel
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
        {
          name: 'ENABLE_ORYX_BUILD'
          value: 'true'
        }
        {
          name: 'NPM_CONFIG_PRODUCTION'
          value: 'false'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~22'
        }
      ]
    }
  }
}

output id string = appService.id
output name string = appService.name
output endpoint string = 'https://${appService.properties.defaultHostName}'
