@skipMobile
Feature: Lockout status API endpoint

  Scenario: TODO placeholder test
    Given I make an API request with the config:
      """
        method: GET
        path: "/lockout-status/{{FEATURE_ID}}"
        queryParameters:
          TODO: TODO
        pathReplacements:
          "{{FEATURE_ID}}": "{{FEATURE_ID}}"
      """
    Then the response status code should be "200"
    And the response body should be:
      """
        TODO: TODO
      """