param (
    [Parameter(Mandatory=$true)]
    [string]$ProjectId,
    
    [Parameter(Mandatory=$true)]
    [string]$DatabaseUrl
)

Write-Host "Deploying Go Backend to Google Cloud Run..."
Write-Host "Project ID: $ProjectId"

# Set the GCP project
gcloud config set project $ProjectId

# Deploy from source to Cloud Run
# This will automatically build the container and deploy it
gcloud run deploy smart-ai-backend `
  --source ./Backend-main `
  --region us-central1 `
  --allow-unauthenticated `
  --set-env-vars="DB_HOST=$DatabaseUrl"

Write-Host "Backend deployment initiated!"
