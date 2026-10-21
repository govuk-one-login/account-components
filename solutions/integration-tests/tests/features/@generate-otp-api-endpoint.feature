@skipMobile
Feature: Generate OTP API endpoint

  Scenario: TODO placeholder test
    Given I make an API request with the config:
      """
        method: POST
        path: "/generate-otp/{{FEATURE_ID}}"
        body:
          TODO: TODO
        pathReplacements:
          "{{FEATURE_ID}}": "{{FEATURE_ID}}"
      """
    Then the response status code should be "200"
    And the response body should be:
      """
        TODO: TODO
      """