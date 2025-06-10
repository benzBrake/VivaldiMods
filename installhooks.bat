@ECHO OFF&(PUSHD "%~DP0")&(REG QUERY "HKU\S-1-5-19">NUL 2>&1)||(
powershell -Command "Start-Process '%~sdpnx0' -Verb RunAs '%*'"&&EXIT)

@set installhooks_args=%*& set installhooks_self=%~f0& powershell -c "(gc \"%~f0\") -replace '@set installhooks_args.*','#' | Write-Host" | powershell -c -& goto :eof

$srcdir = split-path $env:installhooks_self

### --- 修改开始 --- ###

# 初始化变量
$vivpath_exe = $null
$nowait = $false

# 1. 优先检查并解析命令行参数
if ($env:installhooks_args) {
  try {
    # 使用更健壮的解析方式来处理带空格的路径
    $vivargs = [Management.Automation.CommandCompletion]::CompleteInput($env:installhooks_args, $env:installhooks_args.Length, $null, [ref]$null).CompletionMatches.CompletionText
  } catch {
    # 如果上面的方法失败（在某些旧版PowerShell中可能），回退到简单方式
    $vivargs = $env:installhooks_args.Split(' ')
  }
  
  $nowait = $vivargs | Where-Object { $_ -eq '-nowait' }
  # 假定第一个不是 "-nowait" 的参数就是 Vivaldi 的路径
  $vivpath_exe = $vivargs | Where-Object { $_ -ne '-nowait' -and $_ -like '*.exe' } | Select-Object -First 1
}

# 2. 如果用户没有提供路径，则开始自动检测
if (-Not $vivpath_exe) {
  Write-Host "No path provided via arguments, attempting to auto-detect Vivaldi..."
  Try {
    # 注意: 这里获取的是 vivaldi.exe 的完整路径
    $vivpath_exe = (Get-ItemProperty -ErrorAction SilentlyContinue 'Registry::HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\App Paths\vivaldi.exe').'(default)'
  }
  Catch {}
}

if (-Not $vivpath_exe) {
  Try {
    $vivFolderPath = (Get-ItemProperty -ErrorAction SilentlyContinue 'Registry::HKEY_CURRENT_USER\Software\Vivaldi').DestinationFolder
    if ($vivFolderPath) {
      $vivpath_exe = Join-Path $vivFolderPath "Application\vivaldi.exe"
    }
  }
  Catch {}
}

if (-Not $vivpath_exe) {
  Try {
    $ftypestring = ( (cmd /c ftype) | Where-Object { $_ -contains 'Vivaldi' } ).split('=')[1]
    # 注意: 这里获取的是 vivaldi.exe 的完整路径
    $vivpath_exe = ([management.automation.psparser]::Tokenize($ftypestring, [ref]$null) | Where-Object {$_.Type -eq 'String'} | Select-Object -First 1).Content
  }
  Catch {}
}

# 3. 最后检查是否成功获取路径
if (-Not $vivpath_exe -or -Not (Test-Path $vivpath_exe)) {
  write-warning "Can't find Vivaldi installation path. You can specify it as an argument."
  Write-Warning "Example: installhooks.bat `"C:\Program Files\Vivaldi\Application\vivaldi.exe`""
}
else {
  Try {
    # 从 vivaldi.exe 的完整路径中获取其所在的目录
    $vivpath = Split-Path $vivpath_exe
    Write-Host "Vivaldi application path found: $vivpath"
    
    # 这里的 $dstdir 逻辑可能需要根据实际文件结构调整，但通常是正确的
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

### --- 修改结束 --- ###

if (-Not $nowait) {
  Write-Host -NoNewLine "Press any key to continue..."
  $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

Try {
  #last try is not executed :-\
}
Catch {
}