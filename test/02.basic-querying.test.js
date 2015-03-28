require('./init.js');
var async = require('async');
var db, User;

describe('basic-querying', function () {

    before(function (done) {
        this.timeout(4000);

        // turn on additional logging
        /*process.env.DEBUG += ',loopback:connector:*';
        console.log('process.env.DEBUG: ' + process.env.DEBUG);*/

        db = getSchema();
        User = db.define('User', {
            seq: {type: Number, index: true},
            name: {type: String, index: true, sort: true},
            email: {type: String, index: true},
            birthday: {type: Date, index: true},
            role: {type: String, index: true},
            order: {type: Number, index: true, sort: true},
            vip: {type: Boolean}
        });

        setTimeout(function(){
            // no big reason to delay this ...
            // just want to give the feel that getSchema and automigrate are sequential actions
        db.automigrate(done);
        }, 2000);

    });

    describe('ping', function () {
        it('should be able to test connections', function (done) {
            db.ping(function (err) {
                should.not.exist(err);
                done();
            });
        });
    });

    describe('findById', function () {

        before(function (done) {
            User.destroyAll(done);
        });

        it('should query by id: not found', function (done) {
            // TODO: wait a few seconds for the Users to be destroyed? near-real-time != real-time
            User.findById(1, function (err, u) {
                should.not.exist(u);
                should.not.exist(err);
                done();
            });
        });

        it('should query by id: found', function (done) {
            this.timeout(4000);
            User.create(function (err, u) {
                should.not.exist(err);
                should.exist(u.id);
                setTimeout(function(){
                    User.findById(u.id, function (err, u) {
                        console.log('err: ', err);
                        console.log('user: ', u);
                        should.exist(u);
                        should.not.exist(err);
                        u.should.be.an.instanceOf(User);
                        done();
                    });
                }, 2000);
            });
        });

    });

    describe('custom', function () {

        it('suggests query should work', function (done) {
            User.all({
                suggests: {
                    'title_suggester': {
                        text: 'd',
                        term: {
                            field: 'name'
                        }
                    }
                }
            }, function (err, u) {
                //should.exist(u);
                should.not.exist(err);
                done();
            });
        });

        it('native query should work', function (done) {
            User.all({
                native: {
                    query: {
                        'match_all': {}
                    }
                }
            }, function (err, u) {
                should.exist(u);
                should.not.exist(err);
                done();
            });
        });
    });

    describe('findByIds', function () {
        var createdUsers;
        before(function(done) {
            this.timeout(4000);
            var people = [
                { id: 1, name: 'a', vip: true },
                { id: 2, name: 'b' },
                { id: 3, name: 'c' },
                { id: 4, name: 'd', vip: true },
                { id: 5, name: 'e' },
                { id: 6, name: 'f' }
            ];
            db.automigrate(['User'], function(err) {
                should.not.exist(err);
                User.create(people, function(err, users) {
                    should.not.exist(err);
                    // Users might be created in parallel and the generated ids can be
                    // out of sequence
                    createdUsers = users;
                    done();
                });
            });
        });

        it('should query by ids', function(done) {
            this.timeout(4000);
            setTimeout(function(){
                User.findByIds(
                    [createdUsers[2].id, createdUsers[1].id, createdUsers[0].id],
                    function(err, users) {
                        should.exist(users);
                        should.not.exist(err);
                        var names = users.map(function(u) {
                            return u.name;
                        });
                        names.should.eql(
                            [createdUsers[2].name, createdUsers[1].name, createdUsers[0].name]);
                        done();
                    });
            }, 2000);
        });

        it('should query by ids and condition', function(done) {
            this.timeout(4000);
            setTimeout(function(){
                User.findByIds([
                        createdUsers[0].id,
                        createdUsers[1].id,
                        createdUsers[2].id,
                        createdUsers[3].id], // this helps test "inq"
                    { where: { vip: true } }, function(err, users) {
                        should.exist(users);
                        should.not.exist(err);
                        var names = users.map(function(u) {
                            return u.name;
                        });
                        names.should.eql(createdUsers.slice(0, 4).
                            filter(function(u) {
                                return u.vip;
                            }).map(function(u) {
                                return u.name;
                            }));
                        done();
                    });
            }, 2000);
        });

    });

    describe('find', function () {

        before(seed);

        it('should query collection', function (done) {
            this.timeout(4000);
            // NOTE: ES indexing then searching isn't real-time ... its near-real-time
            setTimeout(function(){
                User.find(function (err, users) {
                    should.exist(users);
                    should.not.exist(err);
                    users.should.have.lengthOf(6);
                    done();
                });
            }, 2000);
        });

        it('should query limited collection', function (done) {
            User.find({limit: 3}, function (err, users) {
                should.exist(users);
                should.not.exist(err);
                users.should.have.lengthOf(3);
                done();
            });
        });

        it('should query ordered collection with skip & limit', function (done) {
            User.find({skip: 1, limit: 4, order: 'seq'}, function (err, users) {
                should.exist(users);
                should.not.exist(err);
                users[0].seq.should.be.eql(1);
                users.should.have.lengthOf(4);
                done();
            });
        });

        it('should query ordered collection with offset & limit', function (done) {
            User.find({offset: 2, limit: 3, order: 'seq'}, function (err, users) {
                should.exist(users);
                should.not.exist(err);
                users[0].seq.should.be.eql(2);
                users.should.have.lengthOf(3);
                done();
            });
        });

        it('should query filtered collection', function (done) {
            User.find({where: {role: 'lead'}}, function (err, users) {
                should.exist(users);
                should.not.exist(err);
                users.should.have.lengthOf(2);
                done();
            });
        });

        it('should query collection sorted by numeric field', function (done) {
            User.find({order: 'order'}, function (err, users) {
                should.exist(users);
                should.not.exist(err);
                users.forEach(function (u, i) {
                    u.order.should.eql(i + 1);
                });
                done();
            });
        });

        it('should query collection desc sorted by numeric field', function (done) {
            User.find({order: 'order DESC'}, function (err, users) {
                should.exist(users);
                should.not.exist(err);
                users.forEach(function (u, i) {
                    u.order.should.eql(users.length - i);
                });
                done();
            });
        });

        it('should query collection sorted by string field', function (done) {
            User.find({order: 'name'}, function (err, users) {
                should.exist(users);
                should.not.exist(err);
                users.shift().name.should.equal('George Harrison');
                users.shift().name.should.equal('John Lennon');
                users.pop().name.should.equal('Stuart Sutcliffe');
                done();
            });
        });

        it('should query collection desc sorted by string field', function (done) {
            User.find({order: 'name DESC'}, function (err, users) {
                should.exist(users);
                should.not.exist(err);
                users.pop().name.should.equal('George Harrison');
                users.pop().name.should.equal('John Lennon');
                users.shift().name.should.equal('Stuart Sutcliffe');
                done();
            });
        });

        it('should support "and" operator that is satisfied', function (done) {
            User.find({where: {and: [
                {name: 'John Lennon'},
                {role: 'lead'}
            ]}}, function (err, users) {
                should.not.exist(err);
                users.should.have.property('length', 1);
                done();
            });
        });

        it('should support "and" operator that is not satisfied', function (done) {
            User.find({where: {and: [
                {name: 'John Lennon'},
                {role: 'member'}
            ]}}, function (err, users) {
                should.not.exist(err);
                users.should.have.property('length', 0);
                done();
            });
        });

        it('should support "or" that is satisfied', function (done) {
            User.find({where: {or: [
                {name: 'John Lennon'},
                {role: 'lead'}
            ]}}, function (err, users) {
                should.not.exist(err);
                users.should.have.property('length', 2);
                done();
            });
        });

        it('should support "or" operator that is not satisfied', function (done) {
            User.find({where: {or: [
                {name: 'XYZ'},
                {role: 'Hello1'}
            ]}}, function (err, users) {
                should.not.exist(err);
                users.should.have.property('length', 0);
                done();
            });
        });

        it('should support date "gte" that is satisfied', function (done) {
            User.find({order: 'seq', where: { birthday: { "gte": new Date('1980-12-08') }
            }}, function (err, users) {
                should.not.exist(err);
                users.should.have.property('length', 1);
                users[0].name.should.equal('John Lennon');
                done();
            });
        });

        it('should support date "gt" that is not satisfied', function (done) {
            User.find({order: 'seq', where: { birthday: { "gt": new Date('1980-12-08') }
            }}, function (err, users) {
                should.not.exist(err);
                users.should.have.property('length', 0);
                done();
            });
        });

        it('should support date "gt" that is satisfied', function (done) {
            User.find({order: 'seq', where: { birthday: { "gt": new Date('1980-12-07') }
            }}, function (err, users) {
                should.not.exist(err);
                users.should.have.property('length', 1);
                users[0].name.should.equal('John Lennon');
                done();
            });
        });

        it('should support date "lt" that is satisfied', function (done) {
            User.find({order: 'seq', where: { birthday: { "lt": new Date('1980-12-07') }
            }}, function (err, users) {
                should.not.exist(err);
                users.should.have.property('length', 1);
                users[0].name.should.equal('Paul McCartney');
                done();
            });
        });

        it('should support number "gte" that is satisfied', function (done) {
            User.find({order: 'seq', where: { order: { "gte":  3}
            }}, function (err, users) {
                should.not.exist(err);
                users.should.have.property('length', 4);
                users[0].name.should.equal('George Harrison');
                done();
            });
        });

        it('should support number "gt" that is not satisfied', function (done) {
            User.find({order: 'seq', where: { order: { "gt": 6 }
            }}, function (err, users) {
                should.not.exist(err);
                users.should.have.property('length', 0);
                done();
            });
        });

        it('should support number "gt" that is satisfied', function (done) {
            User.find({order: 'seq', where: { order: { "gt": 5 }
            }}, function (err, users) {
                should.not.exist(err);
                users.should.have.property('length', 1);
                users[0].name.should.equal('Ringo Starr');
                done();
            });
        });

        it('should support number "lt" that is satisfied', function (done) {
            User.find({order: 'seq', where: { order: { "lt": 2 }
            }}, function (err, users) {
                should.not.exist(err);
                users.should.have.property('length', 1);
                users[0].name.should.equal('Paul McCartney');
                done();
            });
        });

        xit('should support number "gt" that is satisfied by null value', function (done) {
            User.find({order: 'seq', where: { order: { "gt": null }
            }}, function (err, users) {
                should.not.exist(err);
                users.should.have.property('length', 0);
                done();
            });
        });

        xit('should support number "lt" that is not satisfied by null value', function (done) {
            User.find({order: 'seq', where: { order: { "lt": null }
            }}, function (err, users) {
                should.not.exist(err);
                users.should.have.property('length', 0);
                done();
            });
        });

        xit('should support string "gte" that is satisfied by null value', function (done) {
            User.find({order: 'seq', where: { name: { "gte":  null}
            }}, function (err, users) {
                should.not.exist(err);
                users.should.have.property('length', 0);
                done();
            });
        });

        it('should support string "gte" that is satisfied', function (done) {
            User.find({order: 'seq', where: { name: { "gte":  'Paul McCartney'}
            }}, function (err, users) {
                should.not.exist(err);
                users.should.have.property('length', 4);
                users[0].name.should.equal('Paul McCartney');
                done();
            });
        });

        it('should support string "gt" that is not satisfied', function (done) {
            User.find({order: 'seq', where: { name: { "gt": 'xyz' }
            }}, function (err, users) {
                should.not.exist(err);
                users.should.have.property('length', 0);
                done();
            });
        });

        it('should support string "gt" that is satisfied', function (done) {
            User.find({order: 'seq', where: { name: { "gt": 'Paul McCartney' }
            }}, function (err, users) {
                should.not.exist(err);
                users.should.have.property('length', 3);
                users[0].name.should.equal('Ringo Starr');
                done();
            });
        });

        it('should support string "lt" that is satisfied', function (done) {
            User.find({order: 'seq', where: { name: { "lt": 'Paul McCartney' }
            }}, function (err, users) {
                should.not.exist(err);
                users.should.have.property('length', 2);
                users[0].name.should.equal('John Lennon');
                done();
            });
        });

        xit('should support boolean "gte" that is satisfied', function (done) {
            User.find({order: 'seq', where: { vip: { "gte":  true}
            }}, function (err, users) {
                should.not.exist(err);
                users.should.have.property('length', 3);
                users[0].name.should.equal('John Lennon');
                done();
            });
        });

        xit('should support boolean "gt" that is not satisfied', function (done) {
            User.find({order: 'seq', where: { vip: { "gt": true }
            }}, function (err, users) {
                should.not.exist(err);
                users.should.have.property('length', 0);
                done();
            });
        });

        xit('should support boolean "gt" that is satisfied', function (done) {
            User.find({order: 'seq', where: { vip: { "gt": false }
            }}, function (err, users) {
                should.not.exist(err);
                users.should.have.property('length', 3);
                users[0].name.should.equal('John Lennon');
                done();
            });
        });

        xit('should support boolean "lt" that is satisfied', function (done) {
            User.find({order: 'seq', where: { vip: { "lt": true }
            }}, function (err, users) {
                should.not.exist(err);
                users.should.have.property('length', 2);
                users[0].name.should.equal('George Harrison');
                done();
            });
        });


        xit('should only include fields as specified', function (done) {
            var remaining = 0;

            function sample(fields) {

                return {
                    expect: function (arr) {
                        remaining++;
                        User.find({fields: fields}, function (err, users) {

                            remaining--;
                            if (err) return done(err);

                            should.exists(users);

                            if (remaining === 0) {
                                done();
                            }

                            users.forEach(function (user) {
                                var obj = user.toObject();

                                Object.keys(obj)
                                    .forEach(function (key) {
                                        // if the obj has an unexpected value
                                        if (obj[key] !== undefined && arr.indexOf(key) === -1) {
                                            console.log('Given fields:', fields);
                                            console.log('Got:', key, obj[key]);
                                            console.log('Expected:', arr);
                                            throw new Error('should not include data for key: ' + key);
                                        }
                                    });
                            });
                        });
                    }
                }
            }

            sample({name: true}).expect(['name']);
            sample({name: false}).expect(['id', 'seq', 'email', 'role', 'order', 'birthday', 'vip']);
            sample({name: false, id: true}).expect(['id']);
            sample({id: true}).expect(['id']);
            sample('id').expect(['id']);
            sample(['id']).expect(['id']);
            sample(['email']).expect(['email']);
        });

    });

    xdescribe('count', function () {

        before(seed);

        it('should query total count', function (done) {
            User.count(function (err, n) {
                should.not.exist(err);
                should.exist(n);
                n.should.equal(6);
                done();
            });
        });

        it('should query filtered count', function (done) {
            User.count({role: 'lead'}, function (err, n) {
                should.not.exist(err);
                should.exist(n);
                n.should.equal(2);
                done();
            });
        });
    });

    xdescribe('findOne', function () {

        before(seed);

        it('should find first record (default sort by id)', function (done) {
            User.all({order: 'id'}, function (err, users) {
                User.findOne(function (e, u) {
                    should.not.exist(e);
                    should.exist(u);
                    u.id.toString().should.equal(users[0].id.toString());
                    done();
                });
            });
        });

        it('should find first record', function (done) {
            User.findOne({order: 'order'}, function (e, u) {
                should.not.exist(e);
                should.exist(u);
                u.order.should.equal(1);
                u.name.should.equal('Paul McCartney');
                done();
            });
        });

        it('should find last record', function (done) {
            User.findOne({order: 'order DESC'}, function (e, u) {
                should.not.exist(e);
                should.exist(u);
                u.order.should.equal(6);
                u.name.should.equal('Ringo Starr');
                done();
            });
        });

        it('should find last record in filtered set', function (done) {
            User.findOne({
                where: {role: 'lead'},
                order: 'order DESC'
            }, function (e, u) {
                should.not.exist(e);
                should.exist(u);
                u.order.should.equal(2);
                u.name.should.equal('John Lennon');
                done();
            });
        });

        it('should work even when find by id', function (done) {
            User.findOne(function (e, u) {
                User.findOne({where: {id: u.id}}, function (err, user) {
                    should.not.exist(err);
                    should.exist(user);
                    done();
                });
            });
        });

    });

    xdescribe('exists', function () {

        before(seed);

        it('should check whether record exist', function (done) {
            User.findOne(function (e, u) {
                User.exists(u.id, function (err, exists) {
                    should.not.exist(err);
                    should.exist(exists);
                    exists.should.be.ok;
                    done();
                });
            });
        });

        it('should check whether record not exist', function (done) {
            User.destroyAll(function () {
                User.exists(42, function (err, exists) {
                    should.not.exist(err);
                    exists.should.not.be.ok;
                    done();
                });
            });
        });

    });

    xdescribe('destroyAll with where option', function () {

        before(seed);

        it('should only delete instances that satisfy the where condition', function (done) {
            User.destroyAll({name: 'John Lennon'}, function () {
                User.find({where: {name: 'John Lennon'}}, function (err, data) {
                    should.not.exist(err);
                    data.length.should.equal(0);
                    User.find({where: {name: 'Paul McCartney'}}, function (err, data) {
                        should.not.exist(err);
                        data.length.should.equal(1);
                        done();
                    });
                });
            });
        });

    });

    xdescribe('updateAll ', function () {

        beforeEach(seed);

        it('should only update instances that satisfy the where condition', function (done) {
            User.update({name: 'John Lennon'}, {name: 'John Smith'}, function () {
                User.find({where: {name: 'John Lennon'}}, function (err, data) {
                    should.not.exist(err);
                    data.length.should.equal(0);
                    User.find({where: {name: 'John Smith'}}, function (err, data) {
                        should.not.exist(err);
                        data.length.should.equal(1);
                        done();
                    });
                });
            });
        });

        it('should update all instances without where', function (done) {
            User.update({name: 'John Smith'}, function () {
                User.find({where: {name: 'John Lennon'}}, function (err, data) {
                    should.not.exist(err);
                    data.length.should.equal(0);
                    User.find({where: {name: 'John Smith'}}, function (err, data) {
                        should.not.exist(err);
                        data.length.should.equal(6);
                        done();
                    });
                });
            });
        });

        it('should ignore undefined values of data', function(done) {
            User.update({name: 'John Lennon'}, {name: undefined,
                email: 'johnl@b3atl3s.co.uk'}, function(err) {
                should.not.exist(err);
                User.find({where: {name: 'John Lennon'}}, function(err, data) {
                    should.not.exist(err);
                    data.length.should.equal(1);
                    data[0].email.should.equal('johnl@b3atl3s.co.uk');
                    done();
                });
            });
        });

        it('should coerce data', function (done) {
            User.update({name: 'John Lennon'}, {birthday: 'invalidate'}, function (err) {
                should.exist(err);
                done();
            });
        });

    });

});

function seed(done) {
    var beatles = [
        {
            seq: 0,
            name: 'John Lennon',
            email: 'john@b3atl3s.co.uk',
            role: 'lead',
            birthday: new Date('1980-12-08'),
            order: 2,
            vip: true
        },
        {
            seq: 1,
            name: 'Paul McCartney',
            email: 'paul@b3atl3s.co.uk',
            role: 'lead',
            birthday: new Date('1942-06-18'),
            order: 1,
            vip: true
        },
        {seq: 2, name: 'George Harrison', order: 5, vip: false},
        {seq: 3, name: 'Ringo Starr', order: 6, vip: false},
        {seq: 4, name: 'Pete Best', order: 4},
        {seq: 5, name: 'Stuart Sutcliffe', order: 3, vip: true}
    ];

    async.series([
        User.destroyAll.bind(User),
        function(cb) {
            async.each(beatles, User.create.bind(User), cb);
        }
    ], done);
}
