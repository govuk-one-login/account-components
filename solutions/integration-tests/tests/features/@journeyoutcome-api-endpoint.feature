@skipMobile
Feature: Journey outcome API endpoint

  Scenario: Invalid request
    Given I make an API request with the config:
      """
        method: GET
        path: "/journeyoutcome"
      """
    Then the response status code should be "400"
    And the response body should be:
      """
        error: invalid_request
        error_description: E4006
      """