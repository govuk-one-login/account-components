# @skipMobile
Feature: Generate OTP API endpoint

  Scenario: Valid request returns an OTP
    When I make a valid request to the generate OTP endpoint
    Then the generate OTP response has status 200 and contains an OTP and expiresAt

  Scenario: Invalid request returns an error
    When I make an invalid request to the generate OTP endpoint
    Then the generate OTP response has status 400 and code 1001

  Scenario: TooManyOTPsRequested lockout returns an error
    When I make enough requests to the generate OTP endpoint to trigger a TooManyOTPsRequested lockout
    Then the generate OTP response has status 400 and code 1002
