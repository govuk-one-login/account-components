Feature: Device intelligence cookie

  Scenario: User has the di-device-intelligence cookie
    Given I go to the "Non-existent page" page
    And the page has finished loading
    Then the di-device-intelligence cookie has been set
