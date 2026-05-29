@skipMobile
Feature: Token API endpoint

  Scenario: Invalid request
    Given I make an API request with the config:
      """
        method: POST
        path: "/token"
      """
    Then the response status code should be "400"
    And the response body should be:
      """
        error: invalid_request
        error_description: E4001
      """