@skipMobile
Feature: Token API endpoint

  Scenario: Invalid request
    When I make an invalid request to the token endpoint then the response is as expected  