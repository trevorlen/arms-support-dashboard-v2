# Authentication Testing Script
# Tests all authentication endpoints

$baseUrl = "http://localhost:7071/api"

Write-Host "`n=== Testing Authentication System ===" -ForegroundColor Cyan

# Test 1: Login
Write-Host "`n1. Testing Login (POST /auth/login)" -ForegroundColor Yellow
$loginBody = @{
    username = "admin"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    Write-Host "  ✓ Login successful!" -ForegroundColor Green
    Write-Host "  User: $($loginResponse.user.username) ($($loginResponse.user.role))" -ForegroundColor White
    $token = $loginResponse.token
    Write-Host "  Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
} catch {
    Write-Host "  ✗ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    $token = $null
}

if ($token) {
    # Test 2: Get Current User
    Write-Host "`n2. Testing Get Current User (GET /auth/me)" -ForegroundColor Yellow
    try {
        $headers = @{ Authorization = "Bearer $token" }
        $meResponse = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method Get -Headers $headers
        Write-Host "  ✓ Auth me successful!" -ForegroundColor Green
        Write-Host "  User: $($meResponse.user.full_name) ($($meResponse.user.role))" -ForegroundColor White
    } catch {
        Write-Host "  ✗ Auth me failed: $($_.Exception.Message)" -ForegroundColor Red
    }

    # Test 3: List Users (Admin only)
    Write-Host "`n3. Testing List Users (GET /users) [Admin Only]" -ForegroundColor Yellow
    try {
        $usersResponse = Invoke-RestMethod -Uri "$baseUrl/users" -Method Get -Headers $headers
        Write-Host "  ✓ List users successful!" -ForegroundColor Green
        Write-Host "  Found $($usersResponse.users.Count) user(s):" -ForegroundColor White
        foreach ($user in $usersResponse.users) {
            Write-Host "    - $($user.username) ($($user.role)) - $($user.full_name)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  ✗ List users failed: $($_.Exception.Message)" -ForegroundColor Red
    }

    # Test 4: Create New User (Admin only)
    Write-Host "`n4. Testing Create User (POST /users) [Admin Only]" -ForegroundColor Yellow
    $newUserBody = @{
        username = "testuser"
        password = "testpass123"
        full_name = "Test User"
        role = "Viewer"
    } | ConvertTo-Json

    try {
        $createResponse = Invoke-RestMethod -Uri "$baseUrl/users" -Method Post -Body $newUserBody -ContentType "application/json" -Headers $headers
        Write-Host "  ✓ Create user successful!" -ForegroundColor Green
        Write-Host "  Created: $($createResponse.user.username) ($($createResponse.user.role))" -ForegroundColor White
        $newUserId = $createResponse.user.id
    } catch {
        Write-Host "  ✗ Create user failed: $($_.Exception.Message)" -ForegroundColor Red
        $newUserId = $null
    }

    if ($newUserId) {
        # Test 5: Update User (Admin only)
        Write-Host "`n5. Testing Update User (PUT /users/$newUserId) [Admin Only]" -ForegroundColor Yellow
        $updateBody = @{
            full_name = "Test User Updated"
            role = "Manager"
        } | ConvertTo-Json

        try {
            $updateResponse = Invoke-RestMethod -Uri "$baseUrl/users/$newUserId" -Method Put -Body $updateBody -ContentType "application/json" -Headers $headers
            Write-Host "  ✓ Update user successful!" -ForegroundColor Green
            Write-Host "  Updated: $($updateResponse.user.full_name) ($($updateResponse.user.role))" -ForegroundColor White
        } catch {
            Write-Host "  ✗ Update user failed: $($_.Exception.Message)" -ForegroundColor Red
        }

        # Test 6: Delete User (Admin only)
        Write-Host "`n6. Testing Delete User (DELETE /users/$newUserId) [Admin Only]" -ForegroundColor Yellow
        try {
            $deleteResponse = Invoke-RestMethod -Uri "$baseUrl/users/$newUserId" -Method Delete -Headers $headers
            Write-Host "  ✓ Delete user successful!" -ForegroundColor Green
            Write-Host "  Message: $($deleteResponse.message)" -ForegroundColor White
        } catch {
            Write-Host "  ✗ Delete user failed: $($_.Exception.Message)" -ForegroundColor Red
        }
    }

    # Test 7: Logout
    Write-Host "`n7. Testing Logout (POST /auth/logout)" -ForegroundColor Yellow
    try {
        $logoutResponse = Invoke-RestMethod -Uri "$baseUrl/auth/logout" -Method Post -Headers $headers
        Write-Host "  ✓ Logout successful!" -ForegroundColor Green
        Write-Host "  Message: $($logoutResponse.message)" -ForegroundColor White
    } catch {
        Write-Host "  ✗ Logout failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 8: Test Invalid Credentials
Write-Host "`n8. Testing Invalid Credentials" -ForegroundColor Yellow
$invalidLoginBody = @{
    username = "admin"
    password = "wrongpassword"
} | ConvertTo-Json

try {
    $invalidResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $invalidLoginBody -ContentType "application/json"
    Write-Host "  X Should have failed but did not!" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "  OK Correctly rejected invalid credentials!" -ForegroundColor Green
    } else {
        Write-Host "  ? Unexpected error: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host "`n=== Testing Complete ===" -ForegroundColor Cyan
