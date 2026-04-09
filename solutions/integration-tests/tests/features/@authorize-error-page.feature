Feature: Authorize error page

  # Should fail because of known accessibility issues
  @failMobile
  Scenario: Visit the authorize error page
    Given I go to the "Authorize error" page
    Then the page looks as expected
    And the page meets our accessibility standards