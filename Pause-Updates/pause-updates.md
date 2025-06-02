# Pause Updates

To pause Windows updates for more than 1 week, use the following registry tweak.

1. First, open Windows Registry Editor.
2. Then, navigate to the registry key below.
> Computer\HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings
3. Double-click the **FlightSettingsMaxPauseDays** (REG_DWORD) name on the Settings key’s right pane to open it, if it exists.
4. Enter a [Hexadecimal] value **00001c84** to allow pausing Windows Update for up to 20 years.

If you do not see the “FlightSettingsMaxPauseDays” item
1. Right-click a blank area and create a new DWORD (32-bit) registry item.
2. Enter the name “FlightSettingsMaxPauseDays” and enter a [Hexadecimal] value 00001c84 to allow pausing Windows Update for up to 20 years.
