Feature: Language switcher

  Scenario: Defaults to English
    Given I go to the "Non-existent page" page
    Then the language toggle shows
    And the "lng" cookie is set to "en"
    And the page looks as expected

  Scenario: Switches to Welsh from English
    Given I go to the "Non-existent page" page
    Then the language toggle shows
    And the "lng" cookie is set to "en"
    Given I click the "Cymraeg" language link
    Then the "lng" cookie is set to "cy"
    And there is a "lng" query string parameter set to "cy"
    And the page looks as expected

  Scenario: Switches to English from Welsh
    Given I go to the "Non-existent page" page
    Then the language toggle shows
    And the "lng" cookie is set to "en"
    Given I click the "Cymraeg" language link
    Then the "lng" cookie is set to "cy"
    And there is a "lng" query string parameter set to "cy"
    Given I click the "English" language link
    Then the "lng" cookie is set to "en"
    And there is a "lng" query string parameter set to "en"
    And the page looks as expected
