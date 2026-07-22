@ECHO OFF&(PUSHD "%~DP0")&(REG QUERY "HKU\S-1-5-19">NUL 2>&1)||(
powershell -Command "Start-Process '%~sdpnx0' -Verb RunAs '%*'"&&EXIT)

@set installhooks_args=%*& set installhooks_self=%~f0& powershell -c "(gc \"%~f0\") -replace '@set installhooks_args.*','#' | Write-Host" | powershell -c -& goto :eof

$srcdir = split-path $env:installhooks_self

###############################################################################
#                             Find-VivaldiPath()                              #
###############################################################################
function Find-VivaldiPath {
    param(
        [string]$ArgString
    )

    $vivpath_exe = $null

    #
    # ---- 1. 解析命令行参数 ----
    #
    if ($ArgString) {
        try {
            $vivargs = [Management.Automation.CommandCompletion]::CompleteInput(
                $ArgString,
                $ArgString.Length,
                $null,
                [ref]$null
            ).CompletionMatches.CompletionText
        }
        catch {
            $vivargs = $ArgString.Split(' ')
        }

        $global:nowait = $vivargs | Where-Object { $_ -eq '-nowait' }
        $vivpath_exe = $vivargs |
            Where-Object { $_ -ne '-nowait' -and $_ -like '*.exe' } |
            Select-Object -First 1

        if ($vivpath_exe -and (Test-Path $vivpath_exe)) {
            return $vivpath_exe
        }
    }

    #
    # ---- 2. App Paths 注册表 ----
    #
    Try {
        $exe = (Get-ItemProperty -ErrorAction SilentlyContinue `
            'Registry::HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\App Paths\vivaldi.exe').'(default)'
        if ($exe -and (Test-Path $exe)) {
            return $exe
        }
    } catch {}

    #
    # ---- 3. HKCU\Software\Vivaldi ----
    #
    Try {
        $vivFolderPath = (Get-ItemProperty -ErrorAction SilentlyContinue `
            'Registry::HKEY_CURRENT_USER\Software\Vivaldi').DestinationFolder

        if ($vivFolderPath) {
            $exe = Join-Path $vivFolderPath 'Application\vivaldi.exe'
            if (Test-Path $exe) {
                return $exe
            }
        }
    } catch {}

    #
    # ---- 4. ToastActivatorCLSID（新增支持） ----
    #
    Try {
        $toastKey = 'Registry::HKEY_CURRENT_USER\SOFTWARE\Vivaldi\ToastActivatorCLSID'
        $props = Get-ItemProperty -Path $toastKey -ErrorAction SilentlyContinue

        if ($props) {
            $candidate = $props.PSObject.Properties |
                Where-Object {
                    $_.Name -match 'vivaldi\.exe$' -and (Test-Path $_.Name)
                } |
                Select-Object -First 1

            if ($candidate) {
                return $candidate.Name
            }
        }
    } catch {}

    #
    # ---- 5. ftype ----
    #
    Try {
        $ftypestring = (cmd /c ftype | Where-Object { $_ -contains 'Vivaldi' }).split('=')[1]

        $exe = ([management.automation.psparser]::Tokenize($ftypestring, [ref]$null) |
                Where-Object { $_.Type -eq 'String' } |
                Select-Object -First 1).Content

        if ($exe -and (Test-Path $exe)) {
            return $exe
        }
    }
    catch {}

    return $null
}
###############################################################################
#                          Show-VivaldiPathHints()                            #
###############################################################################
function Show-VivaldiPathHints {

    Write-Warning "Can't find Vivaldi installation path."

    Write-Host ""
    Write-Host "👉 You can specify the path manually, for example:" -ForegroundColor Cyan
    Write-Host "    installhooks.bat `"C:\Users\xxx\AppData\Local\Vivaldi\Application\vivaldi.exe`""
    Write-Host ""

    Write-Host "🔎 Searching for possible Vivaldi installations..." -ForegroundColor Yellow

    $candidates = @()

    $common = @(
        "$env:LOCALAPPDATA\Vivaldi\Application\vivaldi.exe",
        "$env:PROGRAMFILES\Vivaldi\Application\vivaldi.exe",
        "$env:PROGRAMFILES(X86)\Vivaldi\Application\vivaldi.exe"
    )

    foreach ($p in $common) {
        if (Test-Path $p) { $candidates += $p }
    }

    # 扫描用户目录（不全盘，速度快）
    $scanRoot = @(
        "$env:LOCALAPPDATA",
        "$env:PROGRAMFILES",
        "$env:PROGRAMFILES(x86)"
    )

    foreach ($root in $scanRoot) {
        Try {
            $found = Get-ChildItem -Path $root -Recurse -Filter "vivaldi.exe" -ErrorAction SilentlyContinue |
                Select-Object -ExpandProperty FullName

            $candidates += $found
        } Catch {}
    }

    $candidates = $candidates | Sort-Object -Unique

    if ($candidates.Count -eq 0) {
        Write-Host "❌ No Vivaldi executable found on system." -ForegroundColor Red
        return
    }

    Write-Host ""
    Write-Host "Possible Vivaldi paths:" -ForegroundColor Green

    $i = 1
    foreach ($c in $candidates | Select-Object -First 10) {
        Write-Host "  [$i] $c"
        $i++
    }

    Write-Host ""
}

###############################################################################
#                                主逻辑开始                                   #
###############################################################################

$vivpath_exe = Find-VivaldiPath -ArgString $env:installhooks_args

if (-Not $vivpath_exe) {
    Write-Warning "Can't find Vivaldi installation path. You can specify it as an argument."
    Write-Warning 'Example: installhooks.bat "C:\Program Files\Vivaldi\Application\vivaldi.exe"'
}
else {
    Try {
        $vivpath = Split-Path $vivpath_exe
        Write-Host "Vivaldi application path found: $vivpath"

        # 查找最新的 background-bundle.js 所在目录
        $dstdir = split-path (
            Get-ChildItem -path $vivpath -Recurse background-bundle.js |
                Sort-Object -Property CreationTime -Descending |
                Select-Object -First 1
        ).FullName

        Write-Host "Destination directory: $dstdir"

        Write-Host "Backing up window.html"
        Copy-Item -Path (join-path $dstdir "window.html") `
            -Destination (join-path $dstdir "window_backup.html") -Force

        $encoding = (New-Object System.Text.UTF8Encoding($False))

        Write-Host "Updating window.html"
        $html = Get-Content (join-path $dstdir "window.html") -encoding UTF8
        $outhtml = @()
        $html | ForEach-Object {
            $line = $_
            if ($line.ToLower().Contains('<script src="chrome/userchrome.js"></script>')) {
                return
            }
            elseif ($line.ToLower().Contains('</body>')) {
                $outhtml += '    <script src="chrome/userChrome.js"></script>'
            }
            $outhtml += $_
        }

        [System.IO.File]::WriteAllLines((join-path $dstdir "window.html"), $outhtml, $encoding)

        Write-Host "Copying files"
        $excludedDirectories = @("deprecated", "test")
        $sourceRoot = $srcdir
        if (-Not $sourceRoot.EndsWith([string][IO.Path]::DirectorySeparatorChar)) {
            $sourceRoot += [IO.Path]::DirectorySeparatorChar
        }
        $filesToCopy = Get-ChildItem -LiteralPath $srcdir -Recurse -File | Where-Object {
            $relativePath = $_.FullName.Substring($sourceRoot.Length)
            $directoryNames = (Split-Path $relativePath -Parent) -split '[\\/]'

            $relativePath -notin @("README.md", "LICENSE") -and
                -not ($directoryNames | Where-Object { $_ -in $excludedDirectories })
        }
        foreach ($file in $filesToCopy) {
            $relativePath = $file.FullName.Substring($sourceRoot.Length)
            $destinationPath = Join-Path $dstdir $relativePath
            $destinationDirectory = Split-Path $destinationPath -Parent

            New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
            Copy-Item -LiteralPath $file.FullName -Destination $destinationPath -Force
        }

        Write-Host "Done"
    }
    Catch {
        Write-Host "Error: $_"
    }
}

###############################################################################
#                              等待退出（除非 -nowait）                       #
###############################################################################
if (-Not $nowait) {
  Write-Host -NoNewLine "Press any key to continue..."
  $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

Try {
  # last try
}
Catch {}
