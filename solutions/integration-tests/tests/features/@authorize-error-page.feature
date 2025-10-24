Feature: Authorize error page

  @postDeploy @failMobile
  Scenario: Visit the authorize error page
    Given I go to the "Authorize error" page
    And the page has finished loading
    Then the page looks as expected
    And the page meets our accessibility standards