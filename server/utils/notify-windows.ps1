# Shows one desktop notification through the tray, then exits.
param(
  [string]$Title = "Orbit",
  [string]$Body = ""
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$notification = New-Object System.Windows.Forms.NotifyIcon
$notification.Icon = [System.Drawing.SystemIcons]::Information
$notification.Visible = $true
$notification.ShowBalloonTip(8000, $Title, $Body, [System.Windows.Forms.ToolTipIcon]::Info)

# The balloon needs the process alive while it is on screen
Start-Sleep -Seconds 8
$notification.Dispose()
