Write-Host "STARTING VERSION RELEASE"
Write-Host "========================"
Write-Host ""

# Step 1: Merge commits to 'release' branch
$currentBranch = git rev-parse --abbrev-ref HEAD
if ($currentBranch -ne "realitytwin") {
    Write-Host "Error: The 'realitytwin' branch is not currently checked out."
    Write-Host "Script has to be started out of the 'realitytwin' branch! Only the changes there can be released!"
    Write-Host "Aborting the script."
    Exit
}
# Get the last commit message of 'realitytwin':
$lastCommitMessage = git log -1 --pretty=format:%s
# Check if the 'release' branch is checked out and merge 'realitytwin' into it
git checkout release
$currentBranch = git rev-parse --abbrev-ref HEAD
if ($currentBranch -ne "release") {
    Write-Host "Error: The 'release' branch is not currently checked out. See git error message above."
    Write-Host "Aborting the script."
    Exit
}
git pull
git merge realitytwin

# Step 2: Increase version number and get all information for the new version
$readmePath = "README.md"
$currentVersionPattern = "(?<=## Current Version\r?\n\r?\nv)(.+)"
$readmeContent = Get-Content $readmePath -Raw
$version = [regex]::Match($readmeContent, $currentVersionPattern).Groups[1].Value
# Check if the new version number has a trailing flag
$versionParts = $version -split "-"
if ($versionParts.Length -gt 1) {
    $flag = [int]$versionParts[-1]
    $versionWithoutFlag = $versionParts[0]
} else {
    $versionWithoutFlag = $version
    $flag = 0
}
# Get the tag message from the tag with the versionWithoutFlag
$lastTagMessage = git tag -l --format='%(contents)' "v$versionWithoutFlag" | Out-String
$lastTagMessage = $lastTagMessage.Trim()
# Prompt the user to enter the new version number or hit Enter to keep the same version
$newVersionWithoutFlag = Read-Host "Enter the new version number (current version: $versionWithoutFlag) [hit Enter to keep the same version]"
$isVersionDifferent = $false
# Validate the new version number or check if the user wants to keep the same version
if (-not [string]::IsNullOrWhiteSpace($newVersionWithoutFlag)) {
    if (-not ($newVersionWithoutFlag -match '^\d+\.\d+\.\d+$')) {
        Write-Host "Invalid version number. Please enter a valid version number in the format X.Y.Z."
        Exit
    }
    # Check if the new version is different from the current version
    $currentVersionParts = $versionWithoutFlag -split "\."
    $newVersionParts = $newVersionWithoutFlag -split "\."
    for ($i = 0; $i -lt 3; $i++) {
        if ([int]$newVersionParts[$i] -gt [int]$currentVersionParts[$i]) {
            $isVersionDifferent = $true
            break
        } elseif ([int]$newVersionParts[$i] -lt [int]$currentVersionParts[$i]) {
            break
        }
    }
} else {
    $newVersionWithoutFlag = $versionWithoutFlag
}
if (-not $isVersionDifferent) {
    # Prompt for confirmation to keep the same version
    Write-Host ""
    Write-Host "You want to keep the current version number and release a new image..."
    $confirmationMessage = "Are you sure? (This is typically only applicable for code fixes) [yes/no]"
    $confirmation = Read-Host $confirmationMessage
    Write-Host ""
    # Check the confirmation response
    if ($confirmation -ne "yes") {
        Write-Host "Aborted. Please run the script again to enter a new version number."
        Exit
    }
}
if (-not $isVersionDifferent) {
    # If the version is not different, use the last tag message as the default commit message
    $defaulCommitMessage = $lastTagMessage
    $messageSource = 'tag'
}
else {
    # If the version is different, use the last commit message as the default commit message
    $defaulCommitMessage = $lastCommitMessage
    $messageSource = 'commit'
}
# Prompt the user to enter a custom tag message
$customTagMessage = Read-Host "Enter a custom tag message [hit Enter to use the last $messageSource message '$defaulCommitMessage']"
if ([string]::IsNullOrWhiteSpace($customTagMessage)) {
    $tagMessage = $defaulCommitMessage
    Write-Host "The tag message is '$tagMessage'."
} else {
    $tagMessage = $customTagMessage
}
# Add a flag to the version number, if same version is re-released
if (-not $isVersionDifferent) {
    $flag = $flag + 1
    $newVersion = "$newVersionWithoutFlag-$flag"
} else {
    $newVersion = $newVersionWithoutFlag
}

# Step 3: Update the version number in the README.md and package.json file
$updatedReadmeContent = $readmeContent -replace $currentVersionPattern, $newVersion
$streamWriter = [System.IO.StreamWriter]::new($readmePath, $false)
$streamWriter.Write($updatedReadmeContent.Trim())
$streamWriter.Close()
git add $readmePath
# update the version in package.json
$packageJsonPath = "package.json"
$packageJsonContent = Get-Content $packageJsonPath -Raw
$packageJsonContent = $packageJsonContent -replace '"version":\s*".+?"', "`"version`": `"$newVersionWithoutFlag`""
$streamWriter = [System.IO.StreamWriter]::new($packageJsonPath, $false)
$streamWriter.Write($packageJsonContent.Trim())     
$streamWriter.Close()
git add $packageJsonPath
if (-not $isVersionDifferent) {
    git commit -m "FIX: re-release version (v$newVersion)"
} else {
    git commit -m "CHORE: release new version (v$newVersion)"
}

# Step 4: Tag commit and move 'latest' tag
git tag -d latest
git push origin :refs/tags/latest
if (-not $isVersionDifferent) {
    # Remove the current tag to push a new one...
    git tag -d v$versionWithoutFlag
    git push origin :refs/tags/v$versionWithoutFlag
}
git tag -a v$newVersionWithoutFlag -m "$tagMessage"
git tag -a latest -m "Latest tagged version"

# Step 5: Push commit and tag
git push
git push origin v$newVersionWithoutFlag
git push origin latest

# Step 6: Switch back to the 'realitytwin' branch
git checkout realitytwin

Write-Host ""
Write-Host "VERSION 'v$newVersionWithoutFlag' WAS RELEASED"
Write-Host "================================="