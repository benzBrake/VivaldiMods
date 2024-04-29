@ECHO OFF&(PUSHD "%~DP0")&(REG QUERY "HKU\S-1-5-19">NUL 2>&1)||(
powershell -Command "Start-Process '%~sdpnx0' -Verb RunAs"&&EXIT)

@set installhooks_args=%*& set installhooks_self=%~f0& powershell -c "(gc \"%~f0\") -replace '@set installhooks_args.*','#' | Write-Host" | powershell -c -& goto :eof

$srcdir = split-path $env:installhooks_self

if ($env:installhooks_args) {
  $vivargs = iex "echo $env:installhooks_args"
  $nowait = $vivargs | Where-Object { $_ -eq '-nowait' }
  $vivpath = $vivargs | Where-Object { $_ -ne '-nowait' }
}

if (-Not $vivpath) {
  Try {
    $vivpath = Split-Path ((Get-ItemProperty -ErrorAction SilentlyContinue 'Registry::HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\App Paths\vivaldi.exe').'(default)')
  }
  Catch {
  }
}

if (-Not $vivpath) {
  Try {
    $vivpath = (Get-ItemProperty -ErrorAction SilentlyContinue 'Registry::HKEY_CURRENT_USER\Software\Vivaldi').DestinationFolder
    if ($vivFolderPath) {
      $vivpath = Join-Path $vivFolderPath "Application\vivaldi.exe"
    }
  }
  Catch {
  }
}

if (-Not $vivpath) {
  Try {
    $ftypestring = ( (cmd /c ftype) | Where-Object { $_ -contains 'Vivaldi' } ).split('=')[1]
    $vivpath = Split-Path ([management.automation.psparser]::Tokenize($ftypestring, [ref]$null)[0].content)
  }
  Catch {
  }
}

if (-Not $vivpath) {
  write-warning "Can't find Vivaldi installation path"
}
else {
  Try {
    $dstdir = split-path ((Get-ChildItem -path $vivpath -r background-bundle.js | Sort-Object -property CreationTime -descending | Select-Object -first 1).FullName)
    write-host "Destination directory: $dstdir"

    write-host "Backing up window.html"
    Copy-Item -Path (join-path $dstdir "window.html") -Destination (join-path $dstdir "window_backup.html") -Force

    $encoding = (New-Object System.Text.UTF8Encoding($False))
    write-host "Updating window.html"
    $html = Get-Content (join-path $dstdir "window.html") -encoding UTF8
    $outhtml = @()
    $html | ForEach-Object {
      $line = $_
      if ($line.tolower().contains('<script src="chrome/userChrome.js"></script>')) {
        return
      }
      elseif ($line.tolower().contains('</body>')) {
        $outhtml += '    <script src="chrome/userChrome.js"></script>'
      }
      $outhtml += $_
    }
    [System.IO.File]::WriteAllLines((join-path $dstdir "window.html"), $outhtml, $encoding)
    write-host "Copying files"
    $filesToCopy = Get-ChildItem $srcdir | Where-Object { $_.Name -notin @("README.md", "LICENSE") }
    foreach ($file in $filesToCopy) {
      copy-Item -Path $file.FullName -Destination $dstdir -Recurse -Force
    }

    write-host "Done"
  }
  Catch {
    write-host "Error: " $_
  }
}

if (-Not $nowait) {
  Write-Host -NoNewLine "Press any key to continue..."
  $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

Try {
  #last try is not executed :-\
}
Catch {
}