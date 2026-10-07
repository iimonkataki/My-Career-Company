# Minimal, robust local static HTTP server for Windows PowerShell with Clean URL support
$port = 8080
$prefix = "http://localhost:$port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
    Write-Host "Multi-Page Server started at $prefix"
    Write-Host "Press Ctrl+C to stop or kill the background process."

    $basePath = (Get-Location).Path

    $mimeTypes = @{
        ".html" = "text/html; charset=utf-8";
        ".css"  = "text/css; charset=utf-8";
        ".js"   = "application/javascript; charset=utf-8";
        ".json" = "application/json; charset=utf-8";
        ".jpg"  = "image/jpeg";
        ".jpeg" = "image/jpeg";
        ".png"  = "image/png";
        ".svg"  = "image/svg+xml";
        ".ico"  = "image/x-icon";
        ".woff2"= "font/woff2";
        ".woff" = "font/woff";
        ".ttf"  = "font/ttf"
    }

    # Route mappings for clean nested URLs
    $routeMap = @{
        "/career-clinic/readiness-score" = "readiness-score.html";
        "/career-clinic/placement-plan"  = "placement-plan.html";
        "/readiness-gap"                 = "readiness-gap.html";
        "/framework"                     = "framework.html";
        "/career-clinic"                 = "career-clinic.html";
        "/students"                      = "students.html";
        "/institutions"                  = "institutions.html";
        "/leadership"                    = "leadership.html";
        "/experience"                    = "experience.html";
        "/contact"                       = "contact.html"
    }

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $urlPath = $request.Url.LocalPath.ToLower().TrimEnd('/')
        if ($urlPath -eq "") {
            $urlPath = "/"
        }

        $filePath = ""

        if ($urlPath -eq "/") {
            $filePath = [System.IO.Path]::Combine($basePath, "index.html")
        } elseif ($routeMap.ContainsKey($urlPath)) {
            $filePath = [System.IO.Path]::Combine($basePath, $routeMap[$urlPath])
        } else {
            $relPath = $urlPath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
            $candidatePath = [System.IO.Path]::Combine($basePath, $relPath)

            if ([System.IO.File]::Exists($candidatePath)) {
                $filePath = $candidatePath
            } elseif ([System.IO.File]::Exists($candidatePath + ".html")) {
                $filePath = $candidatePath + ".html"
            } elseif ([System.IO.File]::Exists([System.IO.Path]::Combine($candidatePath, "index.html"))) {
                $filePath = [System.IO.Path]::Combine($candidatePath, "index.html")
            }
        }

        if ($filePath -ne "" -and [System.IO.File]::Exists($filePath)) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = "application/octet-stream"
            if ($mimeTypes.ContainsKey($ext)) {
                $contentType = $mimeTypes[$ext]
            }

            try {
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $response.ContentType = $contentType
                $response.ContentLength64 = $bytes.Length
                $response.StatusCode = 200
                $response.AddHeader("Access-Control-Allow-Origin", "*")
                $response.AddHeader("Cache-Control", "no-cache")
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } catch {
                $response.StatusCode = 500
            }
        } else {
            $response.StatusCode = 404
            $notFoundBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $urlPath")
            $response.ContentType = "text/plain; charset=utf-8"
            $response.ContentLength64 = $notFoundBytes.Length
            $response.OutputStream.Write($notFoundBytes, 0, $notFoundBytes.Length)
        }

        $response.OutputStream.Close()
    }
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
    $listener.Close()
}
