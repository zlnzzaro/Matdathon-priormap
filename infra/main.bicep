targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the environment that can be used as part of naming resource convention')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

@description('GitHub token for Copilot SDK')
@secure()
param githubToken string = ''

@description('Copilot model to use')
param copilotModel string = 'gpt-4o'

// Tags for all resources
var tags = {
  'azd-env-name': environmentName
}

var abbrs = loadJsonContent('./abbreviations.json')
var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))

// Resource Group
resource rg 'Microsoft.Resources/resourceGroups@2022-09-01' = {
  name: 'rg-${environmentName}'
  location: location
  tags: tags
}

// Log Analytics Workspace
module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring'
  scope: rg
  params: {
    location: location
    tags: tags
    logAnalyticsName: '${abbrs.operationalInsightsWorkspaces}${resourceToken}'
    applicationInsightsName: '${abbrs.insightsComponents}${resourceToken}'
  }
}

// App Service
module appService 'modules/appservice.bicep' = {
  name: 'appservice'
  scope: rg
  params: {
    location: location
    tags: tags
    appServicePlanName: '${abbrs.webServerFarms}${resourceToken}'
    appServiceName: '${abbrs.webSitesAppService}${resourceToken}'
    applicationInsightsConnectionString: monitoring.outputs.applicationInsightsConnectionString
    githubToken: githubToken
    copilotModel: copilotModel
  }
}

// Outputs for azd
output AZURE_LOCATION string = location
output AZURE_TENANT_ID string = tenant().tenantId
output SERVICE_API_ENDPOINT string = appService.outputs.endpoint
output SERVICE_API_NAME string = appService.outputs.name
output APPLICATIONINSIGHTS_CONNECTION_STRING string = monitoring.outputs.applicationInsightsConnectionString
