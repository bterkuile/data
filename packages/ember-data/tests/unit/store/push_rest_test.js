var env, store, Person, PhoneNumber, Post;
var attr = DS.attr, hasMany = DS.hasMany, belongsTo = DS.belongsTo;

module("unit/store/push_rest - DS.Store#push", {
  setup: function() {
    Person = DS.Model.extend({
      firstName: attr('string'),
      lastName: attr('string'),
      phoneNumbers: hasMany('phoneNumber', { async: true })
    });

    PhoneNumber = DS.Model.extend({
      number: attr('string'),
      person: belongsTo('person')
    });

    env = setupStore({ "person": Person, "phoneNumber": PhoneNumber});

    store = env.store;

    env.container.register('serializer:application', DS.RESTSerializer);
  },

  teardown: function() {
    Ember.run(function() {
      store.destroy();
    });
  }
});

test("Calling push with a normalized hash containing IDs of related records returns a record and creates reverse association", function() {
  var number1 = store.push('phoneNumber', {
    id: "1",
    number: '5551212',
    person: 'wat'
  });

  var number2 = store.push('phoneNumber', {
    id: "2",
    number: '5552121',
    person: 'wat'
  });
  env.adapter.find = function(store, type, id) {
    if (id === "1") return number1;
    if (id === "2") return number2;
  };
  var person = store.push('person', {
    id: 'wat',
    firstName: 'John',
    lastName: 'Smith',
    phoneNumbers: ["1", "2"]
  });

  person.get('phoneNumbers').then(function(phoneNumbers){
    var foundNumber = phoneNumbers.findProperty('id', '1');
    var foundPerson = foundNumber.get('person');
    equal(foundNumber, number1, "The found number is the expected");
    equal(foundPerson, person, "Inverse relation is set to person");
  })

});
test("Calling push with a normalized hash containing IDs of related records separated over two pushPayload calls makes correct associations", function () {
  equal(Ember.String.camelize(Ember.String.pluralize(store.modelFor('phoneNumber').typeKey)), 'phoneNumbers', 'typeKey Check');
  store.pushPayload({
    person: {
      id: 'what',
      firstName: "Yehuda",
      phoneNumbers: ['1']
    },
    phoneNumbers:  [{id: "1", number: "5551212", person: 'what'}]
  });
  store.pushPayload({
    phoneNumbers: [{id: '2', number: '5551212', person: 'what'}]
  });

  var person = store.getById('person', 'what');
  var phone1 = store.getById('phoneNumber', '1');
  var phone2 = store.getById('phoneNumber', '2');
  equal(person.get('firstName'), "Yehuda", "Bluh");
  equal(phone1.get('person'), person, "Direct relation with nuber 1 should be made");
  equal(phone2.get('person'), person, "Direct relation with number 2 should be made");

  // Now see if the reverse association exists
  equal(phone2.get('person').get('phoneNumbers').map(function(pn){return pn.id}), ['1', '2'], 'Inverse relations for both pushPayload commands should be made');
});
