Feature: Device intelligence cookie
  Scenario: User has the di-device-intelligence cookie
    Given I go to the "Non-existent page" page
    Then the di-device-intelligence cookie has been set
